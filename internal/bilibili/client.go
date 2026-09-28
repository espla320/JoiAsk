package bilibili

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	defaultBaseURL   = "https://api.bilibili.com"
	maxAvatarSize    = 5 << 20
	defaultUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
)

// Profile is the public information of a B 站 user.
type Profile struct {
	MID     int64
	Name    string
	FaceURL string
}

// Client talks to the public B 站 endpoints that do not require a login cookie.
type Client struct {
	BaseURL    string
	HTTPClient *http.Client
	// AvatarHosts lists the image hosts that may be downloaded. It defaults to
	// the B 站 image CDN.
	AvatarHosts []string
}

func NewClient() *Client {
	return &Client{
		BaseURL:     defaultBaseURL,
		HTTPClient:  &http.Client{Timeout: 15 * time.Second},
		AvatarHosts: []string{"hdslb.com"},
	}
}

func (c *Client) baseURL() string {
	if c.BaseURL == "" {
		return defaultBaseURL
	}
	return c.BaseURL
}

func (c *Client) httpClient() *http.Client {
	if c.HTTPClient == nil {
		return &http.Client{Timeout: 15 * time.Second}
	}
	return c.HTTPClient
}

func (c *Client) avatarHosts() []string {
	if len(c.AvatarHosts) == 0 {
		return []string{"hdslb.com"}
	}
	return c.AvatarHosts
}

type cardResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    struct {
		Card struct {
			Name string `json:"name"`
			Face string `json:"face"`
		} `json:"card"`
	} `json:"data"`
}

// Profile fetches the public profile of a B 站 user.
func (c *Client) Profile(ctx context.Context, uid int64) (Profile, error) {
	if uid <= 0 {
		return Profile{}, errors.New("B 站 UID 无效")
	}
	value := strconv.FormatInt(uid, 10)
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL()+"/x/web-interface/card?mid="+value, nil)
	if err != nil {
		return Profile{}, err
	}
	request.Header.Set("User-Agent", defaultUserAgent)
	request.Header.Set("Referer", "https://space.bilibili.com/"+value)
	response, err := c.httpClient().Do(request)
	if err != nil {
		return Profile{}, fmt.Errorf("请求 B 站失败: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return Profile{}, fmt.Errorf("B 站返回 HTTP %d", response.StatusCode)
	}
	var payload cardResponse
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&payload); err != nil {
		return Profile{}, fmt.Errorf("B 站响应无效: %w", err)
	}
	if payload.Code == -404 {
		return Profile{}, errors.New("B 站用户不存在")
	}
	if payload.Code != 0 {
		return Profile{}, fmt.Errorf("B 站返回错误: %s (%d)", payload.Message, payload.Code)
	}
	card := payload.Data.Card
	if strings.TrimSpace(card.Name) == "" || strings.TrimSpace(card.Face) == "" {
		return Profile{}, errors.New("B 站用户信息不完整")
	}
	return Profile{MID: uid, Name: card.Name, FaceURL: card.Face}, nil
}

// Avatar downloads an avatar image from an allowed B 站 image host.
func (c *Client) Avatar(ctx context.Context, faceURL string) ([]byte, error) {
	parsed, err := url.Parse(strings.TrimSpace(faceURL))
	if err != nil || !c.allowedAvatarHost(parsed) {
		return nil, errors.New("B 站头像地址无效")
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("User-Agent", defaultUserAgent)
	request.Header.Set("Referer", "https://www.bilibili.com/")
	response, err := c.httpClient().Do(request)
	if err != nil {
		return nil, fmt.Errorf("下载 B 站头像失败: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("下载 B 站头像失败: HTTP %d", response.StatusCode)
	}
	content, err := io.ReadAll(io.LimitReader(response.Body, maxAvatarSize+1))
	if err != nil {
		return nil, fmt.Errorf("读取 B 站头像失败: %w", err)
	}
	if len(content) == 0 {
		return nil, errors.New("B 站头像内容为空")
	}
	if len(content) > maxAvatarSize {
		return nil, errors.New("B 站头像超过 5 MB")
	}
	if !strings.HasPrefix(http.DetectContentType(content), "image/") {
		return nil, errors.New("B 站头像格式无效")
	}
	return content, nil
}

func (c *Client) allowedAvatarHost(value *url.URL) bool {
	host := strings.ToLower(value.Hostname())
	if host == "" {
		return false
	}
	for _, allowed := range c.avatarHosts() {
		allowed = strings.ToLower(allowed)
		if host == allowed || strings.HasSuffix(host, "."+allowed) {
			return true
		}
	}
	return false
}

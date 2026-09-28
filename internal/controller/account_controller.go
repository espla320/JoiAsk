package controller

import (
	"bytes"
	"context"
	"io"
	"joiask-backend/internal/bilibili"
	"joiask-backend/internal/database"
	"joiask-backend/internal/storage"
	"joiask-backend/pkg/util"
	"mime"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
)

const memberSessionKey = "member_bilibili_uid"

// maxAvatarSize limits an uploaded avatar to 5 MB.
const maxAvatarSize = 5 << 20

// BilibiliClient fetches public B 站 profiles and avatars.
type BilibiliClient interface {
	Profile(ctx context.Context, uid int64) (bilibili.Profile, error)
	Avatar(ctx context.Context, faceURL string) ([]byte, error)
}

type AccountController struct {
	Bilibili BilibiliClient
	Storage  storage.Storage
}

func (ctl *AccountController) bilibili() BilibiliClient {
	if ctl.Bilibili != nil {
		return ctl.Bilibili
	}
	return bilibili.NewClient()
}

func (ctl *AccountController) storage() storage.Storage {
	if ctl.Storage != nil {
		return ctl.Storage
	}
	return storage.Get()
}

type accountLoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type accountRegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func publicUser(user database.User) gin.H {
	return gin.H{
		"username":                user.Username,
		"bilibili_uid":            strconv.FormatInt(user.BilibiliUID, 10),
		"display_id":              user.DisplayID,
		"display_is_bilibili_uid": user.DisplayIsBilibiliUID,
		"bilibili_name":           user.BilibiliName,
		"bilibili_avatar":         user.BilibiliAvatar,
		"verified_at":             user.VerifiedAt,
		"is_disabled":             user.IsDisabled,
		"created_at":              user.CreatedAt,
		"updated_at":              user.UpdatedAt,
	}
}

// Register creates a local account. No B 站 verification is involved: the
// member only picks a login name and a password.
func (*AccountController) Register(c *gin.Context) {
	var body accountRegisterRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		Fail(c, 400, "请求无效")
		return
	}
	if utf8.RuneCountInString(body.Password) < 8 || len([]byte(body.Password)) > 72 {
		Fail(c, 400, "密码长度需为 8 至 72 个字符")
		return
	}
	body.Username = strings.TrimSpace(body.Username)
	if utf8.RuneCountInString(body.Username) < 2 || utf8.RuneCountInString(body.Username) > 32 || strings.IndexFunc(body.Username, unicode.IsSpace) >= 0 {
		Fail(c, 400, "登录名需为 2 至 32 个字符且不能包含空格")
		return
	}
	var count int64
	if err := database.DB.Model(&database.User{}).Where("username = ?", body.Username).Count(&count).Error; err != nil {
		Fail(c, 500, "内部错误")
		return
	}
	if count > 0 {
		Fail(c, 409, "该登录名已被使用")
		return
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		Fail(c, 500, "内部错误")
		return
	}
	now := time.Now().UTC()
	var user database.User
	for attempt := 0; attempt < 5; attempt++ {
		accountID, err := nextAccountID()
		if err != nil {
			Fail(c, 500, "内部错误")
			return
		}
		user = database.User{
			BilibiliUID:  accountID,
			Username:     body.Username,
			PasswordHash: string(passwordHash),
			BilibiliName: body.Username,
			VerifiedAt:   now,
		}
		err = database.DB.Create(&user).Error
		if err == nil {
			break
		}
		if !isUniqueViolation(err) {
			Fail(c, 500, "创建账号失败")
			return
		}
	}
	if user.BilibiliUID == 0 {
		Fail(c, 500, "创建账号失败")
		return
	}
	session := sessions.Default(c)
	session.Set(memberSessionKey, user.BilibiliUID)
	if err := session.Save(); err != nil {
		Fail(c, 500, "账号已创建，请重新登录")
		return
	}
	Success(c, publicUser(user))
}

// nextAccountID returns the next internal account id. Local accounts have no
// B 站 uid, so the stored number is just an opaque identifier.
func nextAccountID() (int64, error) {
	var maxID int64
	if err := database.DB.Model(&database.User{}).Select("COALESCE(MAX(bilibili_uid), 0)").Scan(&maxID).Error; err != nil {
		return 0, err
	}
	return maxID + 1, nil
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "unique") || strings.Contains(message, "duplicate")
}

type accountProfileRequest struct {
	DisplayID            string `json:"display_id"`
	DisplayIsBilibiliUID bool   `json:"display_is_bilibili_uid"`
}

type accountPasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

// ChangePassword lets a signed-in member replace their own password after
// confirming the current one.
func (*AccountController) ChangePassword(c *gin.Context) {
	user, ok := currentMember(c)
	if !ok {
		Fail(c, 408, "请先登录")
		return
	}
	var body accountPasswordRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		Fail(c, 400, "请求无效")
		return
	}
	if utf8.RuneCountInString(body.NewPassword) < 8 || len([]byte(body.NewPassword)) > 72 {
		Fail(c, 400, "密码长度需为 8 至 72 个字符")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.OldPassword)) != nil {
		Fail(c, 403, "原密码不正确")
		return
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		Fail(c, 500, "内部错误")
		return
	}
	if err := database.DB.Model(&database.User{}).
		Where("bilibili_uid = ?", user.BilibiliUID).
		Update("password_hash", string(passwordHash)).Error; err != nil {
		Fail(c, 500, "修改密码失败")
		return
	}
	Success(c, nil)
}

// UpdateProfile stores the public id the member wants to show on real-name posts.
// When the id is marked as a B 站 uid the display name follows the B 站 nickname
// and otherwise it falls back to the login name.
func (ctl *AccountController) UpdateProfile(c *gin.Context) {
	user, ok := currentMember(c)
	if !ok {
		Fail(c, 408, "请先登录")
		return
	}
	var body accountProfileRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		Fail(c, 400, "请求无效")
		return
	}
	displayID := strings.TrimSpace(body.DisplayID)
	if utf8.RuneCountInString(displayID) > 32 {
		Fail(c, 400, "展示 ID 最多 32 个字符")
		return
	}
	if strings.IndexFunc(displayID, unicode.IsSpace) >= 0 {
		Fail(c, 400, "展示 ID 不能包含空格")
		return
	}
	if body.DisplayIsBilibiliUID && !isNumericID(displayID) {
		Fail(c, 400, "勾选 B 站 UID 时展示 ID 必须为纯数字")
		return
	}
	if err := database.DB.Model(&database.User{}).Where("bilibili_uid = ?", user.BilibiliUID).Updates(map[string]any{
		"display_id":              displayID,
		"display_is_bilibili_uid": body.DisplayIsBilibiliUID,
	}).Error; err != nil {
		Fail(c, 500, "保存失败")
		return
	}
	user.DisplayID = displayID
	isBilibiliUID := body.DisplayIsBilibiliUID
	user.DisplayIsBilibiliUID = &isBilibiliUID
	if isBilibiliUID {
		uid, err := strconv.ParseInt(displayID, 10, 64)
		if err != nil {
			Fail(c, 400, "B 站 UID 无效")
			return
		}
		ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		defer cancel()
		profile, err := ctl.bilibili().Profile(ctx, uid)
		if err != nil {
			// The id is still saved; the nickname is retried the next time the
			// member fetches the avatar or saves the profile.
			log.Warnf("failed to sync B 站 nickname for uid %d: %v", user.BilibiliUID, err)
		} else if err := ctl.storeDisplayName(&user, profile.Name); err != nil {
			log.Errorf("failed to store display name for uid %d: %v", user.BilibiliUID, err)
		}
	} else if user.BilibiliName != user.Username {
		if err := ctl.storeDisplayName(&user, ""); err != nil {
			log.Errorf("failed to reset display name for uid %d: %v", user.BilibiliUID, err)
		}
	}
	Success(c, publicUser(user))
}

// storeDisplayName keeps the member's public name in sync. An empty value resets
// it to the login name.
func (*AccountController) storeDisplayName(user *database.User, name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		name = user.Username
	}
	if name == user.BilibiliName {
		return nil
	}
	if err := database.DB.Model(&database.User{}).
		Where("bilibili_uid = ?", user.BilibiliUID).
		Update("bilibili_name", name).Error; err != nil {
		return err
	}
	user.BilibiliName = name
	return nil
}

// isNumericID reports whether the value only contains ASCII digits.
func isNumericID(value string) bool {
	if value == "" {
		return false
	}
	for _, character := range value {
		if character < '0' || character > '9' {
			return false
		}
	}
	return true
}

// UploadAvatar stores a member uploaded avatar image and remembers its URL.
func (ctl *AccountController) UploadAvatar(c *gin.Context) {
	user, ok := currentMember(c)
	if !ok {
		Fail(c, 408, "请先登录")
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		Fail(c, 400, "请选择要上传的图片")
		return
	}
	opened, err := file.Open()
	if err != nil {
		Fail(c, 400, "读取图片失败")
		return
	}
	defer opened.Close()
	content, err := io.ReadAll(io.LimitReader(opened, maxAvatarSize+1))
	if err != nil {
		Fail(c, 400, "读取图片失败")
		return
	}
	if len(content) == 0 {
		Fail(c, 400, "图片内容为空")
		return
	}
	if len(content) > maxAvatarSize {
		Fail(c, 400, "图片不能超过 5 MB")
		return
	}
	contentType := http.DetectContentType(content)
	if !strings.HasPrefix(contentType, "image/") {
		Fail(c, 400, "只支持图片文件")
		return
	}
	extensions, _ := mime.ExtensionsByType(contentType)
	extension := ".png"
	if len(extensions) > 0 {
		extension = extensions[0]
	}
	if contentType == "image/jpeg" {
		extension = ".jpg"
	}
	filename := "avatar-" + util.Md5v(string(content)) + extension
	storedURL, err := ctl.storeAvatar(user.BilibiliUID, filename, content)
	if err != nil {
		log.Errorf("failed to store avatar for uid %d: %v", user.BilibiliUID, err)
		Fail(c, 500, "保存头像失败")
		return
	}
	user.BilibiliAvatar = storedURL
	Success(c, publicUser(user))
}

// FetchBilibiliAvatar downloads the avatar of a B 站 uid and stores it as the
// member's avatar.
func (ctl *AccountController) FetchBilibiliAvatar(c *gin.Context) {
	user, ok := currentMember(c)
	if !ok {
		Fail(c, 408, "请先登录")
		return
	}
	var body struct {
		BilibiliUID string `json:"bilibili_uid"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		Fail(c, 400, "请求无效")
		return
	}
	uid, err := strconv.ParseInt(strings.TrimSpace(body.BilibiliUID), 10, 64)
	if err != nil || uid <= 0 {
		Fail(c, 400, "请填写有效的 B 站 UID")
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 20*time.Second)
	defer cancel()
	profile, err := ctl.bilibili().Profile(ctx, uid)
	if err != nil {
		Fail(c, 400, err.Error())
		return
	}
	content, err := ctl.bilibili().Avatar(ctx, profile.FaceURL)
	if err != nil {
		Fail(c, 502, err.Error())
		return
	}
	contentType := http.DetectContentType(content)
	extensions, _ := mime.ExtensionsByType(contentType)
	extension := ".png"
	if len(extensions) > 0 {
		extension = extensions[0]
	}
	if contentType == "image/jpeg" {
		extension = ".jpg"
	}
	filename := "avatar-bilibili-" + util.Md5v(string(content)) + extension
	storedURL, err := ctl.storeAvatar(user.BilibiliUID, filename, content)
	if err != nil {
		log.Errorf("failed to store avatar for uid %d: %v", user.BilibiliUID, err)
		Fail(c, 500, "保存头像失败")
		return
	}
	user.BilibiliAvatar = storedURL
	if err := ctl.storeDisplayName(&user, profile.Name); err != nil {
		log.Errorf("failed to store display name for uid %d: %v", user.BilibiliUID, err)
	}
	Success(c, gin.H{
		"profile": publicUser(user),
		"name":    profile.Name,
	})
}

// storeAvatar saves the image and points the member's avatar at it.
func (ctl *AccountController) storeAvatar(userID int64, filename string, content []byte) (string, error) {
	storedURL, err := ctl.storage().Upload(filename, bytes.NewReader(content))
	if err != nil {
		return "", err
	}
	if !strings.Contains(storedURL, "://") && !strings.HasPrefix(storedURL, "/") {
		storedURL = "/" + storedURL
	}
	if err := database.DB.Model(&database.User{}).Where("bilibili_uid = ?", userID).Update("bilibili_avatar", storedURL).Error; err != nil {
		return "", err
	}
	return storedURL, nil
}

func (*AccountController) Login(c *gin.Context) {
	var body accountLoginRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		Fail(c, 400, "请求无效")
		return
	}
	username := strings.TrimSpace(body.Username)
	if username == "" || utf8.RuneCountInString(username) > 32 {
		Fail(c, 401, "用户名或密码错误")
		return
	}
	var user database.User
	if err := database.DB.Where("username = ?", username).First(&user).Error; err != nil || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)) != nil {
		Fail(c, 401, "用户名或密码错误")
		return
	}
	if user.IsDisabled {
		Fail(c, 403, "账号已被禁用")
		return
	}
	session := sessions.Default(c)
	session.Set(memberSessionKey, user.BilibiliUID)
	if err := session.Save(); err != nil {
		Fail(c, 500, "内部错误")
		return
	}
	Success(c, publicUser(user))
}

func (*AccountController) Info(c *gin.Context) {
	user, ok := currentMember(c)
	if !ok {
		Fail(c, 408, "请先登录")
		return
	}
	Success(c, publicUser(user))
}

func (*AccountController) Logout(c *gin.Context) {
	session := sessions.Default(c)
	session.Delete(memberSessionKey)
	if err := session.Save(); err != nil {
		Fail(c, 500, "内部错误")
		return
	}
	Success(c, nil)
}

func currentMember(c *gin.Context) (database.User, bool) {
	uid := sessions.Default(c).Get(memberSessionKey)
	if uid == nil {
		return database.User{}, false
	}
	var user database.User
	if err := database.DB.First(&user, uid).Error; err != nil || user.IsDisabled {
		return database.User{}, false
	}
	return user, true
}

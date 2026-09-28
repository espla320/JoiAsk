package bilibili

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestProfileReadsPublicCard(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/x/web-interface/card" || r.URL.Query().Get("mid") != "32818750" {
			t.Errorf("unexpected request: %s", r.URL.String())
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"code":0,"data":{"card":{"mid":"32818750","name":"-espla-","face":"https://i1.hdslb.com/bfs/face/x.jpg"}}}`))
	}))
	defer server.Close()

	client := NewClient()
	client.BaseURL = server.URL
	profile, err := client.Profile(context.Background(), 32818750)
	if err != nil {
		t.Fatal(err)
	}
	if profile.Name != "-espla-" || !strings.Contains(profile.FaceURL, "hdslb.com") {
		t.Fatalf("unexpected profile: %+v", profile)
	}
}

func TestProfileReportsMissingUser(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"code":-404,"message":"啥都木有"}`))
	}))
	defer server.Close()

	client := NewClient()
	client.BaseURL = server.URL
	if _, err := client.Profile(context.Background(), 999999999999); err == nil {
		t.Fatal("missing user should return an error")
	}
}

func TestAvatarOnlyDownloadsAllowedHosts(t *testing.T) {
	image := testPNG()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(image)
	}))
	defer server.Close()

	client := NewClient()
	client.AvatarHosts = []string{"127.0.0.1"}
	content, err := client.Avatar(context.Background(), server.URL+"/face.png")
	if err != nil {
		t.Fatalf("allowed host should be downloaded: %v", err)
	}
	if len(content) != len(image) {
		t.Fatalf("unexpected avatar size: %d", len(content))
	}

	if _, err := client.Avatar(context.Background(), "https://evil.example.com/face.png"); err == nil {
		t.Fatal("avatar from an unknown host must be rejected")
	}
}

func testPNG() []byte {
	return []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
		0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
		0x54, 0x78, 0x9c, 0x63, 0xfc, 0xcf, 0xc0, 0x50,
		0x0f, 0x00, 0x04, 0x85, 0x01, 0x80, 0x84, 0xa9,
		0x8c, 0x21, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
		0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
	}
}

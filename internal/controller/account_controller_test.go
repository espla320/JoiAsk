package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"joiask-backend/internal/bilibili"
	"joiask-backend/internal/database"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type testAPIResponse struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

func performJSONRequest(router http.Handler, method, path, body string, cookies []*http.Cookie) (*httptest.ResponseRecorder, testAPIResponse) {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	for _, item := range cookies {
		request.AddCookie(item)
	}
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	var response testAPIResponse
	_ = json.Unmarshal(recorder.Body.Bytes(), &response)
	return recorder, response
}

// openTestDatabase points the global database handle at a fresh sqlite file.
func openTestDatabase(t *testing.T, name string) {
	t.Helper()
	var err error
	database.DB, err = gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), name)), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := database.DB.AutoMigrate(&database.User{}, &database.Question{}, &database.Tag{}, &database.Admin{}, &database.LikeRecord{}); err != nil {
		t.Fatal(err)
	}
}

func newAccountRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(sessions.Sessions("session", cookie.NewStore([]byte("test-session-secret-that-is-long-enough"))))
	controller := new(AccountController)
	router.POST("/register", controller.Register)
	router.POST("/login", controller.Login)
	router.GET("/info", controller.Info)
	router.PUT("/profile", controller.UpdateProfile)
	router.PUT("/password", controller.ChangePassword)
	return router
}

func TestAccountRegisterLoginAndProfile(t *testing.T) {
	openTestDatabase(t, "account.db")
	router := newAccountRouter()

	recorder, registered := performJSONRequest(router, http.MethodPost, "/register", `{"username":"alice","password":"strong-password"}`, nil)
	if registered.Code != 200 {
		t.Fatalf("registration failed: %+v", registered)
	}
	cookies := recorder.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("registration should sign the member in")
	}

	var user database.User
	if err := database.DB.Where("username = ?", "alice").First(&user).Error; err != nil {
		t.Fatal(err)
	}
	if user.BilibiliUID <= 0 {
		t.Fatalf("local account should get an internal id, got %d", user.BilibiliUID)
	}
	if user.BilibiliName != "alice" || user.VerifiedAt.IsZero() {
		t.Fatalf("unexpected account defaults: %+v", user)
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("strong-password")) != nil {
		t.Fatal("password was not stored as a valid bcrypt hash")
	}

	// the new session can read its own profile
	_, info := performJSONRequest(router, http.MethodGet, "/info", "", cookies)
	if info.Code != 200 {
		t.Fatalf("account info failed: %+v", info)
	}
	var profile struct {
		Username  string `json:"username"`
		DisplayID string `json:"display_id"`
	}
	if err := json.Unmarshal(info.Data, &profile); err != nil {
		t.Fatal(err)
	}
	if profile.Username != "alice" || profile.DisplayID != "" {
		t.Fatalf("unexpected profile: %+v", profile)
	}

	// members can set their own public id
	_, updated := performJSONRequest(router, http.MethodPut, "/profile", `{"display_id":"12345"}`, cookies)
	if updated.Code != 200 {
		t.Fatalf("profile update failed: %+v", updated)
	}
	if err := database.DB.First(&user, user.BilibiliUID).Error; err != nil {
		t.Fatal(err)
	}
	if user.DisplayID != "12345" {
		t.Fatalf("display id was not stored: %q", user.DisplayID)
	}

	// profile updates require a session
	_, anonymous := performJSONRequest(router, http.MethodPut, "/profile", `{"display_id":"nope"}`, nil)
	if anonymous.Code != 408 {
		t.Fatalf("anonymous profile update should fail: %+v", anonymous)
	}

	// login still works, but disabled accounts are rejected
	_, login := performJSONRequest(router, http.MethodPost, "/login", `{"username":"alice","password":"strong-password"}`, nil)
	if login.Code != 200 {
		t.Fatalf("login failed: %+v", login)
	}
	if err := database.DB.Model(&database.User{}).Where("bilibili_uid = ?", user.BilibiliUID).Update("is_disabled", true).Error; err != nil {
		t.Fatal(err)
	}
	_, disabled := performJSONRequest(router, http.MethodPost, "/login", `{"username":"alice","password":"strong-password"}`, nil)
	if disabled.Code != 403 {
		t.Fatalf("disabled login should fail, got %+v", disabled)
	}
}

func TestAccountRegisterValidation(t *testing.T) {
	openTestDatabase(t, "account-validation.db")
	router := newAccountRouter()

	_, short := performJSONRequest(router, http.MethodPost, "/register", `{"username":"bob","password":"short"}`, nil)
	if short.Code != 400 {
		t.Fatalf("short password should be rejected: %+v", short)
	}
	_, spaced := performJSONRequest(router, http.MethodPost, "/register", `{"username":"b ob","password":"strong-password"}`, nil)
	if spaced.Code != 400 {
		t.Fatalf("login name with spaces should be rejected: %+v", spaced)
	}

	if _, first := performJSONRequest(router, http.MethodPost, "/register", `{"username":"carol","password":"strong-password"}`, nil); first.Code != 200 {
		t.Fatalf("registration failed: %+v", first)
	}
	_, duplicate := performJSONRequest(router, http.MethodPost, "/register", `{"username":"carol","password":"strong-password"}`, nil)
	if duplicate.Code != 409 {
		t.Fatalf("duplicate login name should be rejected: %+v", duplicate)
	}

	var count int64
	if err := database.DB.Model(&database.User{}).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("expected exactly one account, got %d", count)
	}
}

func TestAccountChangePassword(t *testing.T) {
	openTestDatabase(t, "change-password.db")
	router := newAccountRouter()

	recorder, registered := performJSONRequest(router, http.MethodPost, "/register", `{"username":"alice","password":"strong-password"}`, nil)
	if registered.Code != 200 {
		t.Fatalf("registration failed: %+v", registered)
	}
	cookies := recorder.Result().Cookies()

	_, anonymous := performJSONRequest(router, http.MethodPut, "/password", `{"old_password":"strong-password","new_password":"another-password"}`, nil)
	if anonymous.Code != 408 {
		t.Fatalf("anonymous password change should fail: %+v", anonymous)
	}
	_, wrongOld := performJSONRequest(router, http.MethodPut, "/password", `{"old_password":"not-the-password","new_password":"another-password"}`, cookies)
	if wrongOld.Code != 403 {
		t.Fatalf("wrong current password should be rejected: %+v", wrongOld)
	}
	_, tooShort := performJSONRequest(router, http.MethodPut, "/password", `{"old_password":"strong-password","new_password":"short"}`, cookies)
	if tooShort.Code != 400 {
		t.Fatalf("short password should be rejected: %+v", tooShort)
	}
	_, changed := performJSONRequest(router, http.MethodPut, "/password", `{"old_password":"strong-password","new_password":"another-password"}`, cookies)
	if changed.Code != 200 {
		t.Fatalf("password change failed: %+v", changed)
	}

	_, newLogin := performJSONRequest(router, http.MethodPost, "/login", `{"username":"alice","password":"another-password"}`, nil)
	if newLogin.Code != 200 {
		t.Fatalf("login with the new password failed: %+v", newLogin)
	}
	_, oldLogin := performJSONRequest(router, http.MethodPost, "/login", `{"username":"alice","password":"strong-password"}`, nil)
	if oldLogin.Code != 401 {
		t.Fatalf("the old password should stop working, got %+v", oldLogin)
	}
}

type questionAuthorView struct {
	ID        uint   `json:"id"`
	DisplayID string `json:"display_id"`
	Avatar    string `json:"bilibili_avatar"`
	Name      string `json:"bilibili_name"`
}

type fakeAvatarImageStorage struct {
	uploaded map[string][]byte
}

func (s *fakeAvatarImageStorage) Upload(filename string, content *bytes.Reader) (string, error) {
	data, err := io.ReadAll(content)
	if err != nil {
		return "", err
	}
	if s.uploaded == nil {
		s.uploaded = map[string][]byte{}
	}
	s.uploaded[filename] = data
	return "upload-img/" + filename, nil
}

func (s *fakeAvatarImageStorage) Delete(string) error { return nil }

type fakeBilibiliClient struct {
	profile bilibili.Profile
	avatar  []byte
	err     error
}

func (f fakeBilibiliClient) Profile(context.Context, int64) (bilibili.Profile, error) {
	if f.err != nil {
		return bilibili.Profile{}, f.err
	}
	return f.profile, nil
}

func (f fakeBilibiliClient) Avatar(context.Context, string) ([]byte, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.avatar, nil
}

func testAvatarPNG() []byte {
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

func TestAccountProfileMarksBilibiliUID(t *testing.T) {
	openTestDatabase(t, "profile-flag.db")
	router := newAccountRouter()

	recorder, registered := performJSONRequest(router, http.MethodPost, "/register", `{"username":"alice","password":"strong-password"}`, nil)
	if registered.Code != 200 {
		t.Fatalf("registration failed: %+v", registered)
	}
	cookies := recorder.Result().Cookies()

	_, invalid := performJSONRequest(router, http.MethodPut, "/profile", `{"display_id":"alice","display_is_bilibili_uid":true}`, cookies)
	if invalid.Code != 400 {
		t.Fatalf("a non numeric B 站 uid should be rejected: %+v", invalid)
	}
	_, numeric := performJSONRequest(router, http.MethodPut, "/profile", `{"display_id":"32818750","display_is_bilibili_uid":true}`, cookies)
	if numeric.Code != 200 {
		t.Fatalf("saving a B 站 uid failed: %+v", numeric)
	}
	var user database.User
	if err := database.DB.Where("username = ?", "alice").First(&user).Error; err != nil {
		t.Fatal(err)
	}
	if user.DisplayID != "32818750" || user.DisplayIsBilibiliUID == nil || !*user.DisplayIsBilibiliUID {
		t.Fatalf("B 站 uid flag was not stored: %+v", user)
	}

	_, plain := performJSONRequest(router, http.MethodPut, "/profile", `{"display_id":"alice","display_is_bilibili_uid":false}`, cookies)
	if plain.Code != 200 {
		t.Fatalf("saving a plain display id failed: %+v", plain)
	}
	if err := database.DB.First(&user, user.BilibiliUID).Error; err != nil {
		t.Fatal(err)
	}
	if user.DisplayID != "alice" || user.DisplayIsBilibiliUID == nil || *user.DisplayIsBilibiliUID {
		t.Fatalf("plain display id should clear the flag: %+v", user)
	}
}

func TestFetchBilibiliAvatar(t *testing.T) {
	openTestDatabase(t, "bilibili-avatar.db")
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(sessions.Sessions("session", cookie.NewStore([]byte("test-session-secret-that-is-long-enough"))))
	storage := &fakeAvatarImageStorage{}
	controller := &AccountController{
		Bilibili: fakeBilibiliClient{
			profile: bilibili.Profile{MID: 32818750, Name: "-espla-", FaceURL: "https://i1.hdslb.com/bfs/face/x.jpg"},
			avatar:  testAvatarPNG(),
		},
		Storage: storage,
	}
	router.POST("/register", controller.Register)
	router.POST("/avatar/bilibili", controller.FetchBilibiliAvatar)

	recorder, registered := performJSONRequest(router, http.MethodPost, "/register", `{"username":"alice","password":"strong-password"}`, nil)
	if registered.Code != 200 {
		t.Fatalf("registration failed: %+v", registered)
	}
	cookies := recorder.Result().Cookies()

	_, invalid := performJSONRequest(router, http.MethodPost, "/avatar/bilibili", `{"bilibili_uid":"not-a-uid"}`, cookies)
	if invalid.Code != 400 {
		t.Fatalf("invalid uid should be rejected: %+v", invalid)
	}
	_, fetched := performJSONRequest(router, http.MethodPost, "/avatar/bilibili", `{"bilibili_uid":"32818750"}`, cookies)
	if fetched.Code != 200 {
		t.Fatalf("fetching the B 站 avatar failed: %+v", fetched)
	}
	if len(storage.uploaded) != 1 {
		t.Fatalf("expected one stored avatar, got %d", len(storage.uploaded))
	}
	var user database.User
	if err := database.DB.Where("username = ?", "alice").First(&user).Error; err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(user.BilibiliAvatar, "/upload-img/avatar-bilibili-") {
		t.Fatalf("avatar was not stored: %q", user.BilibiliAvatar)
	}
}

func TestQuestionsShowTheCurrentAuthorProfile(t *testing.T) {
	openTestDatabase(t, "author-profile.db")
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(sessions.Sessions("session", cookie.NewStore([]byte("test-session-secret-that-is-long-enough"))))
	router.GET("/question", new(QuestionController).Get)

	tag := database.Tag{TagName: "提问箱"}
	if err := database.DB.Create(&tag).Error; err != nil {
		t.Fatal(err)
	}
	uid := int64(1)
	user := database.User{
		BilibiliUID:    uid,
		Username:       "alice",
		PasswordHash:   "x",
		BilibiliName:   "alice",
		BilibiliAvatar: "/upload-img/avatar-new.png",
		DisplayID:      "32818750",
	}
	if err := database.DB.Create(&user).Error; err != nil {
		t.Fatal(err)
	}
	// written when the profile still had the old display id and a different avatar
	stale := database.Question{
		BilibiliUID: &uid, TagID: int(tag.ID), Content: "旧投稿", IsRealName: true, IsPublish: true,
		BilibiliName: "alice", BilibiliAvatar: "/upload-img/avatar-old.png", DisplayID: "-old-id-",
	}
	anonymous := database.Question{BilibiliUID: &uid, TagID: int(tag.ID), Content: "匿名投稿", IsPublish: true}
	deletedUID := int64(999)
	orphan := database.Question{
		BilibiliUID: &deletedUID, TagID: int(tag.ID), Content: "账号已删除", IsRealName: true, IsPublish: true,
		BilibiliName: "gone", BilibiliAvatar: "/upload-img/avatar-gone.png", DisplayID: "123",
	}
	for _, question := range []*database.Question{&stale, &anonymous, &orphan} {
		if err := database.DB.Create(question).Error; err != nil {
			t.Fatal(err)
		}
	}

	recorder, response := performJSONRequest(router, http.MethodGet, "/question", "", nil)
	if response.Code != 200 {
		t.Fatalf("question list failed: %+v", response)
	}
	var payload struct {
		Data struct {
			Questions []questionAuthorView `json:"questions"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Data.Questions) != 3 {
		t.Fatalf("expected 3 questions, got %d", len(payload.Data.Questions))
	}
	byID := make(map[uint]questionAuthorView, len(payload.Data.Questions))
	for _, question := range payload.Data.Questions {
		byID[question.ID] = question
	}

	if got := byID[stale.ID]; got.DisplayID != "32818750" || got.Avatar != "/upload-img/avatar-new.png" || got.Name != "alice" {
		t.Fatalf("real-name question should show the current profile, got %+v", got)
	}
	if got := byID[anonymous.ID]; got.DisplayID != "" || got.Avatar != "" || got.Name != "" {
		t.Fatalf("anonymous question should expose no author info, got %+v", got)
	}
	if got := byID[orphan.ID]; got.DisplayID != "123" || got.Avatar != "/upload-img/avatar-gone.png" {
		t.Fatalf("question of a deleted account should keep its snapshot, got %+v", got)
	}
}

package controller

import (
	"bytes"
	"encoding/json"
	"joiask-backend/internal/database"
	"net/http"
	"net/http/httptest"
	"path/filepath"
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

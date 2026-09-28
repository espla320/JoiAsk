package controller

import (
	"joiask-backend/internal/database"
	"net/http"
	"testing"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func TestMemberPostCreatesLocalAccount(t *testing.T) {
	openTestDatabase(t, "member.db")
	router := gin.New()
	router.POST("/member", new(MemberController).Post)

	_, created := performJSONRequest(router, http.MethodPost, "/member", `{"username":"manual-user","password":"strong-password","display_id":"233"}`, nil)
	if created.Code != 200 {
		t.Fatalf("manual member creation failed: %+v", created)
	}

	var user database.User
	if err := database.DB.Where("username = ?", "manual-user").First(&user).Error; err != nil {
		t.Fatal(err)
	}
	if user.BilibiliUID <= 0 {
		t.Fatalf("manual member should get an internal id, got %d", user.BilibiliUID)
	}
	if user.BilibiliName != "manual-user" || user.DisplayID != "233" || user.VerifiedAt.IsZero() {
		t.Fatalf("unexpected manually created user: %+v", user)
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("strong-password")) != nil {
		t.Fatal("manual member password was not bcrypt hashed")
	}
}

func TestMemberPostRejectsDuplicateUsername(t *testing.T) {
	openTestDatabase(t, "member-duplicates.db")
	router := gin.New()
	router.POST("/member", new(MemberController).Post)

	_, first := performJSONRequest(router, http.MethodPost, "/member", `{"username":"manual-user","password":"strong-password"}`, nil)
	if first.Code != 200 {
		t.Fatalf("initial member creation failed: %+v", first)
	}
	_, duplicate := performJSONRequest(router, http.MethodPost, "/member", `{"username":"manual-user","password":"strong-password"}`, nil)
	if duplicate.Code != 409 {
		t.Fatalf("duplicate username should be rejected: %+v", duplicate)
	}
	_, short := performJSONRequest(router, http.MethodPost, "/member", `{"username":"another-user","password":"short"}`, nil)
	if short.Code != 400 {
		t.Fatalf("short password should be rejected: %+v", short)
	}
}

func TestMemberResetPassword(t *testing.T) {
	openTestDatabase(t, "member-reset.db")
	router := gin.New()
	router.Use(sessions.Sessions("session", cookie.NewStore([]byte("test-session-secret-that-is-long-enough"))))
	router.POST("/member", new(MemberController).Post)
	router.PUT("/member/:uid/password", new(MemberController).ResetPassword)
	accountController := new(AccountController)
	router.POST("/login", accountController.Login)

	_, created := performJSONRequest(router, http.MethodPost, "/member", `{"username":"manual-user","password":"strong-password"}`, nil)
	if created.Code != 200 {
		t.Fatalf("member creation failed: %+v", created)
	}
	var user database.User
	if err := database.DB.Where("username = ?", "manual-user").First(&user).Error; err != nil {
		t.Fatal(err)
	}

	_, tooShort := performJSONRequest(router, http.MethodPut, "/member/1/password", `{"password":"short"}`, nil)
	if tooShort.Code != 400 {
		t.Fatalf("short password should be rejected: %+v", tooShort)
	}
	_, missing := performJSONRequest(router, http.MethodPut, "/member/4242/password", `{"password":"reset-password"}`, nil)
	if missing.Code != 404 {
		t.Fatalf("unknown member should return 404: %+v", missing)
	}
	_, reset := performJSONRequest(router, http.MethodPut, "/member/1/password", `{"password":"reset-password"}`, nil)
	if reset.Code != 200 {
		t.Fatalf("password reset failed: %+v", reset)
	}

	_, newLogin := performJSONRequest(router, http.MethodPost, "/login", `{"username":"manual-user","password":"reset-password"}`, nil)
	if newLogin.Code != 200 {
		t.Fatalf("login with the reset password failed: %+v", newLogin)
	}
	_, oldLogin := performJSONRequest(router, http.MethodPost, "/login", `{"username":"manual-user","password":"strong-password"}`, nil)
	if oldLogin.Code != 401 {
		t.Fatalf("the old password should stop working, got %+v", oldLogin)
	}
}

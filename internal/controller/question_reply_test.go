package controller

import (
	"encoding/json"
	"joiask-backend/internal/database"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// mirror of router.authMiddleware, which lives in another package
func testAdminOnly(c *gin.Context) {
	session := sessions.Default(c)
	if session.Get("authed") != true || session.Get("user") == nil {
		c.AbortWithStatusJSON(200, gin.H{"code": 408, "message": "请先登录"})
		return
	}
	c.Next()
}

func newReplyTestRouter(controller *QuestionController) *gin.Engine {
	router := gin.New()
	router.Use(sessions.Sessions("session", cookie.NewStore([]byte("test-session-secret-that-is-long-enough"))))
	login := func(admin bool, uid int64) gin.HandlerFunc {
		return func(c *gin.Context) {
			session := sessions.Default(c)
			if admin {
				session.Set("authed", true)
				session.Set("user", uint(1))
			} else {
				session.Set(memberSessionKey, uid)
			}
			_ = session.Save()
			c.Status(http.StatusOK)
		}
	}
	router.GET("/login-as-admin", login(true, 0))
	router.GET("/login-as-author", login(false, 111))
	router.GET("/login-as-other", login(false, 222))
	router.PUT("/question/:id/reply", testAdminOnly, controller.PutReply)
	router.GET("/question", controller.Get)
	router.GET("/account/questions", controller.MyQuestions)
	return router
}

func loginCookies(t *testing.T, router http.Handler, path string) []*http.Cookie {
	t.Helper()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, path, nil)
	router.ServeHTTP(recorder, request)
	return recorder.Result().Cookies()
}

func replyOf(t *testing.T, router http.Handler, path string, cookies []*http.Cookie) string {
	t.Helper()
	recorder, _ := performJSONRequest(router, http.MethodGet, path, "", cookies)
	var payload struct {
		Data struct {
			Questions []map[string]any `json:"questions"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to parse %s: %v", path, err)
	}
	if len(payload.Data.Questions) == 0 {
		return ""
	}
	value, _ := payload.Data.Questions[0]["reply"].(string)
	return value
}

func TestQuestionReplyIsPrivateToAuthor(t *testing.T) {
	gin.SetMode(gin.TestMode)
	var err error
	database.DB, err = gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "reply.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := database.DB.AutoMigrate(&database.Question{}, &database.Tag{}, &database.User{}, &database.Admin{}); err != nil {
		t.Fatal(err)
	}
	authorUID := int64(111)
	otherUID := int64(222)
	database.DB.Create(&database.Admin{Username: "admin", Password: "hash"})
	database.DB.Create(&database.User{BilibiliUID: authorUID, Username: "author", PasswordHash: "x", BilibiliName: "author", BilibiliAvatar: "a", VerifiedAt: time.Now().UTC()})
	database.DB.Create(&database.User{BilibiliUID: otherUID, Username: "other", PasswordHash: "x", BilibiliName: "other", BilibiliAvatar: "a", VerifiedAt: time.Now().UTC()})
	tag := database.Tag{TagName: "提问箱", Description: "默认话题"}
	database.DB.Create(&tag)
	question := database.Question{BilibiliUID: &authorUID, TagID: int(tag.ID), Content: "你好", IsPublish: true}
	if err := database.DB.Create(&question).Error; err != nil {
		t.Fatal(err)
	}

	controller := NewQuestionController()
	router := newReplyTestRouter(controller)
	adminCookies := loginCookies(t, router, "/login-as-admin")
	authorCookies := loginCookies(t, router, "/login-as-author")
	otherCookies := loginCookies(t, router, "/login-as-other")

	// a member cannot write a reply
	_, forbidden := performJSONRequest(router, http.MethodPut, "/question/1/reply", `{"reply":"偷偷回复"}`, authorCookies)
	if forbidden.Code != 408 {
		t.Fatalf("non-admin should not be able to reply, got %+v", forbidden)
	}

	// the administrator can
	_, saved := performJSONRequest(router, http.MethodPut, "/question/1/reply", `{"reply":"谢谢你的提问"}`, adminCookies)
	if saved.Code != 200 {
		t.Fatalf("admin reply failed: %+v", saved)
	}
	var stored database.Question
	if err := database.DB.First(&stored, question.ID).Error; err != nil {
		t.Fatal(err)
	}
	if stored.Reply != "谢谢你的提问" || stored.RepliedAt == nil {
		t.Fatalf("reply was not persisted: %+v", stored)
	}

	// anonymous visitors never see it
	anonymous, _ := performJSONRequest(router, http.MethodGet, "/question", "", nil)
	if strings.Contains(anonymous.Body.String(), "谢谢你的提问") {
		t.Fatal("reply leaked to anonymous visitors")
	}
	if strings.Contains(anonymous.Body.String(), `"reply"`) {
		t.Fatal("anonymous response contains a reply field")
	}

	// neither does another member
	other, _ := performJSONRequest(router, http.MethodGet, "/question", "", otherCookies)
	if strings.Contains(other.Body.String(), "谢谢你的提问") {
		t.Fatal("reply leaked to another member")
	}

	// the author does, both in the public list and in their own list
	if reply := replyOf(t, router, "/question", authorCookies); reply != "谢谢你的提问" {
		t.Fatalf("author should see the reply in the list, got %q", reply)
	}
	if reply := replyOf(t, router, "/account/questions", authorCookies); reply != "谢谢你的提问" {
		t.Fatalf("author should see the reply in their questions, got %q", reply)
	}
	if otherReply := replyOf(t, router, "/account/questions", otherCookies); otherReply != "" {
		t.Fatalf("other member should have no questions, got %q", otherReply)
	}

	// administrators see replies too, so they can edit them
	adminList, _ := performJSONRequest(router, http.MethodGet, "/question", "", adminCookies)
	if !strings.Contains(adminList.Body.String(), "谢谢你的提问") {
		t.Fatal("administrator should see replies")
	}

	// clearing the reply removes it everywhere
	_, cleared := performJSONRequest(router, http.MethodPut, "/question/1/reply", `{"reply":"   "}`, adminCookies)
	if cleared.Code != 200 {
		t.Fatalf("clearing reply failed: %+v", cleared)
	}
	if err := database.DB.First(&stored, question.ID).Error; err != nil {
		t.Fatal(err)
	}
	if stored.Reply != "" || stored.RepliedAt != nil {
		t.Fatalf("reply was not cleared: %+v", stored)
	}
}

func TestQuestionReplyRejectsOversizedContent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	var err error
	database.DB, err = gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "reply-limit.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := database.DB.AutoMigrate(&database.Question{}, &database.Tag{}, &database.Admin{}); err != nil {
		t.Fatal(err)
	}
	database.DB.Create(&database.Admin{Username: "admin", Password: "hash"})
	tag := database.Tag{TagName: "提问箱"}
	database.DB.Create(&tag)
	uid := int64(111)
	database.DB.Create(&database.Question{BilibiliUID: &uid, TagID: int(tag.ID), Content: "你好"})

	router := newReplyTestRouter(NewQuestionController())
	adminCookies := loginCookies(t, router, "/login-as-admin")
	body, err := json.Marshal(map[string]string{"reply": strings.Repeat("好", maxReplyLength+1)})
	if err != nil {
		t.Fatal(err)
	}
	_, response := performJSONRequest(router, http.MethodPut, "/question/1/reply", string(body), adminCookies)
	if response.Code != 400 {
		t.Fatalf("oversized reply should be rejected, got %+v", response)
	}
}

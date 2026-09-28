package controller

import (
	"joiask-backend/internal/database"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"golang.org/x/crypto/bcrypt"
)

type MemberController struct{}

type memberListRequest struct {
	Page     int `form:"page"`
	PageSize int `form:"page_size"`
}

type memberStatusRequest struct {
	IsDisabled *bool `json:"is_disabled"`
}

type memberPasswordRequest struct {
	Password string `json:"password"`
}

type memberCreateRequest struct {
	Username  string `json:"username"`
	Password  string `json:"password"`
	DisplayID string `json:"display_id"`
}

func (*MemberController) Get(c *gin.Context) {
	var query memberListRequest
	if err := c.ShouldBindQuery(&query); err != nil {
		Fail(c, 400, "请求无效")
		return
	}
	page, pageSize := getPage(query.Page), getPageSize(query.PageSize)
	var users []database.User
	var total int64
	if err := database.DB.Model(&database.User{}).Count(&total).Scopes(paginate(page, pageSize)).Order("created_at desc").Find(&users).Error; err != nil {
		Fail(c, 500, "读取注册用户失败")
		return
	}
	items := make([]gin.H, 0, len(users))
	for _, user := range users {
		items = append(items, publicUser(user))
	}
	Success(c, gin.H{"users": items, "total": total, "page": page, "page_size": pageSize})
}

func (*MemberController) Post(c *gin.Context) {
	var body memberCreateRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		Fail(c, 400, "请求无效")
		return
	}
	username := strings.TrimSpace(body.Username)
	if utf8.RuneCountInString(username) < 2 || utf8.RuneCountInString(username) > 32 || strings.IndexFunc(username, unicode.IsSpace) >= 0 {
		Fail(c, 400, "登录名需为 2 至 32 个字符且不能包含空格")
		return
	}
	if utf8.RuneCountInString(body.Password) < 8 || len([]byte(body.Password)) > 72 {
		Fail(c, 400, "密码长度需为 8 至 72 个字符")
		return
	}
	displayID := strings.TrimSpace(body.DisplayID)
	if utf8.RuneCountInString(displayID) > 32 || strings.IndexFunc(displayID, unicode.IsSpace) >= 0 {
		Fail(c, 400, "展示 ID 最多 32 个字符且不能包含空格")
		return
	}
	var count int64
	if err := database.DB.Model(&database.User{}).Where("username = ?", username).Count(&count).Error; err != nil {
		Fail(c, 500, "检查用户失败")
		return
	}
	if count > 0 {
		Fail(c, 409, "该登录名已被使用")
		return
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		Fail(c, 500, "创建用户失败")
		return
	}
	now := time.Now().UTC()
	var user database.User
	for attempt := 0; attempt < 5; attempt++ {
		accountID, err := nextAccountID()
		if err != nil {
			Fail(c, 500, "创建用户失败")
			return
		}
		user = database.User{
			BilibiliUID:  accountID,
			Username:     username,
			PasswordHash: string(passwordHash),
			BilibiliName: username,
			DisplayID:    displayID,
			VerifiedAt:   now,
		}
		err = database.DB.Create(&user).Error
		if err == nil {
			break
		}
		if !isUniqueViolation(err) {
			log.Error(err)
			Fail(c, 500, "创建用户失败")
			return
		}
	}
	if user.BilibiliUID == 0 {
		Fail(c, 409, "创建失败，该登录名可能已被使用")
		return
	}
	Success(c, publicUser(user))
}

func (*MemberController) Put(c *gin.Context) {
	uid, err := strconv.ParseInt(c.Param("uid"), 10, 64)
	if err != nil || uid <= 0 {
		Fail(c, 400, "用户 ID 无效")
		return
	}
	var body memberStatusRequest
	if err := c.ShouldBindJSON(&body); err != nil || body.IsDisabled == nil {
		Fail(c, 400, "请求无效")
		return
	}
	var user database.User
	if err := database.DB.First(&user, uid).Error; err != nil {
		Fail(c, 404, "用户不存在")
		return
	}
	if err := database.DB.Model(&user).Update("is_disabled", *body.IsDisabled).Error; err != nil {
		Fail(c, 500, "更新用户状态失败")
		return
	}
	user.IsDisabled = *body.IsDisabled
	Success(c, publicUser(user))
}

func (*MemberController) Delete(c *gin.Context) {
	uid, err := strconv.ParseInt(c.Param("uid"), 10, 64)
	if err != nil || uid <= 0 {
		Fail(c, 400, "用户 ID 无效")
		return
	}
	var user database.User
	if err := database.DB.First(&user, uid).Error; err != nil {
		Fail(c, 404, "用户不存在")
		return
	}
	if err := database.DB.Delete(&user).Error; err != nil {
		Fail(c, 500, "删除用户失败")
		return
	}
	Success(c, nil)
}

// ResetPassword lets an administrator set a new password for a member, for
// example when the member forgot it.
func (*MemberController) ResetPassword(c *gin.Context) {
	uid, err := strconv.ParseInt(c.Param("uid"), 10, 64)
	if err != nil || uid <= 0 {
		Fail(c, 400, "用户 ID 无效")
		return
	}
	var body memberPasswordRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		Fail(c, 400, "请求无效")
		return
	}
	if utf8.RuneCountInString(body.Password) < 8 || len([]byte(body.Password)) > 72 {
		Fail(c, 400, "密码长度需为 8 至 72 个字符")
		return
	}
	var user database.User
	if err := database.DB.First(&user, uid).Error; err != nil {
		Fail(c, 404, "用户不存在")
		return
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		Fail(c, 500, "重置密码失败")
		return
	}
	if err := database.DB.Model(&database.User{}).
		Where("bilibili_uid = ?", uid).
		Update("password_hash", string(passwordHash)).Error; err != nil {
		Fail(c, 500, "重置密码失败")
		return
	}
	Success(c, nil)
}

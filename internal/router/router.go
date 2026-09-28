package router

import (
	"joiask-backend/internal/controller"
	"net/http"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

func Run() {
	r := gin.Default()
	r.MaxMultipartMemory = 30 << 20 // 30 MB
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001", "*"},
		AllowCredentials: true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
	}))
	sessionSecret := viper.GetString("security.session_secret")
	if len(sessionSecret) < 32 {
		logrus.Warn("security.session_secret is not configured; using the legacy session key")
		sessionSecret = "WhyJoiIsSoCute"
	}
	store := cookie.NewStore([]byte(sessionSecret))
	store.Options(sessions.Options{
		Path:     "/",
		Secure:   viper.GetBool("security.secure_cookie"),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	r.Use(sessions.Sessions("session", store))
	api := r.Group("/api")
	tagController := new(controller.TagController)
	userController := new(controller.UserController)
	questionController := controller.NewQuestionController()
	configController := new(controller.ConfigController)
	statisticsController := new(controller.StatisticsController)
	accountController := new(controller.AccountController)
	memberController := new(controller.MemberController)
	{
		// Public member account
		{
			api.POST("/account/register", accountController.Register)
			api.POST("/account/login", accountController.Login)
			api.GET("/account/info", accountController.Info)
			api.POST("/account/logout", accountController.Logout)
			api.PUT("/account/profile", accountController.UpdateProfile)
			api.POST("/account/avatar", accountController.UploadAvatar)
			api.GET("/account/questions", questionController.MyQuestions)
		}
		// User
		{
			api.POST("/login", userController.Login)
			api.GET("/info", authMiddleware, userController.Info)
			api.GET("/logout", authMiddleware, userController.Logout)

			api.GET("/user", authMiddleware, userController.Get)
			api.POST("/user", authMiddleware, userController.Post)
			api.PUT("/user/:id", authMiddleware, userController.Put)
			api.DELETE("/user/:id", authMiddleware, userController.Delete)
		}
		// Registered members
		{
			api.GET("/member", authMiddleware, memberController.Get)
			api.POST("/member", authMiddleware, memberController.Post)
			api.PUT("/member/:uid", authMiddleware, memberController.Put)
			api.DELETE("/member/:uid", authMiddleware, memberController.Delete)
		}
		// Tag
		{
			api.GET("/tag", tagController.Get)
			api.PUT("/tag/:id", authMiddleware, tagController.Put)
			api.DELETE("/tag/:id", authMiddleware, tagController.Delete)
			api.POST("/tag", authMiddleware, tagController.Post)
		}
		// Question
		{
			api.GET("/question", questionController.Get)
			api.POST("/question", questionController.Post)
			api.PUT("/question/:id", authMiddleware, questionController.Put)
			api.POST("/question/:id/emoji", questionController.Emoji)
			api.GET("/sse", questionController.SSE)
			api.GET("/ws", questionController.WebSocket)
			api.PUT("/question/:id/reply", authMiddleware, questionController.PutReply)
			api.DELETE("/question/:id", authMiddleware, questionController.Delete)
		}
		// Config
		{
			api.GET("/config", configController.Get)
			api.PUT("/config", authMiddleware, configController.Put)
			api.GET("/settings", authMiddleware, configController.GetSettings)
			api.PUT("/settings", authMiddleware, configController.PutSettings)
		}
		// Statistics
		{
			api.GET("/statistics", authMiddleware, statisticsController.Get)
		}
	}
	address := viper.GetString("server.host") + ":" + strconv.Itoa(viper.GetInt("server.port"))
	logrus.Info(address)
	logrus.Error(r.Run(address))
}

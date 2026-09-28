package database

import (
	"encoding/json"
	"time"
)

type BaseModel struct {
	ID        uint      `gorm:"primary_key" json:"id"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}
type Tag struct {
	BaseModel
	TagName     string `gorm:"unique" json:"tag_name"`
	Description string `json:"description"`
}

type Question struct {
	BaseModel
	BilibiliUID    *int64 `gorm:"index" json:"-"`
	TagID          int    `gorm:"index" json:"tag_id"`
	Tag            Tag    `gorm:"foreignkey:TagID" json:"tag"`
	Content        string `json:"content"`
	ImagesNum      int    `json:"images_num"`
	Images         string `json:"images"`
	Likes          int    `json:"likes"`
	IsHide         bool   `gorm:"index" json:"is_hide"`
	IsRainbow      bool   `gorm:"index" json:"is_rainbow"`
	IsArchive      bool   `gorm:"index" json:"is_archive"`
	IsPublish      bool   `gorm:"index" json:"is_publish"`
	IsSpam         bool   `gorm:"index;not null;default:false" json:"is_spam"`
	IsRealName     bool   `gorm:"index;not null;default:false" json:"is_real_name"`
	BilibiliName   string `gorm:"size:255" json:"bilibili_name,omitempty"`
	BilibiliAvatar string `gorm:"size:1024" json:"bilibili_avatar,omitempty"`
	// DisplayID is the author's self-declared public id, shown for real-name posts.
	DisplayID string `gorm:"size:64" json:"display_id,omitempty"`
	// DisplayIsBilibiliUID marks DisplayID as a B 站 uid: such posts link to the
	// author's space. A nil value means "unknown" and falls back to the numeric
	// heuristic, which keeps questions written before this field existed working.
	DisplayIsBilibiliUID *bool  `json:"display_is_bilibili_uid,omitempty"`
	Emojis               string `json:"emojis"`
	// Reply is the administrator's answer to this question. It is never part of
	// the default JSON payload: only the question author and administrators may
	// read it, which is signalled per request with ReplyVisible.
	Reply        string     `gorm:"type:text" json:"-"`
	RepliedAt    *time.Time `json:"-"`
	ReplyVisible bool       `gorm:"-" json:"-"`
}

func (q Question) MarshalJSON() ([]byte, error) {
	type questionAlias Question
	copy := q
	// The internal account id must never be exposed: bilibili_uid is only used
	// for reply ownership. Real-name posts show their self-declared display id.
	if !copy.IsRealName {
		copy.BilibiliName = ""
		copy.BilibiliAvatar = ""
		copy.DisplayID = ""
		copy.DisplayIsBilibiliUID = nil
	}
	var reply *string
	var repliedAt *time.Time
	var hasAuthor *bool
	if copy.ReplyVisible {
		hasAuthorValue := copy.BilibiliUID != nil
		hasAuthor = &hasAuthorValue
		if copy.Reply != "" {
			value := copy.Reply
			reply = &value
			repliedAt = copy.RepliedAt
		}
	}
	return json.Marshal(struct {
		*questionAlias
		Reply     *string    `json:"reply,omitempty"`
		RepliedAt *time.Time `json:"replied_at,omitempty"`
		HasAuthor *bool      `json:"has_author,omitempty"`
	}{
		questionAlias: (*questionAlias)(&copy),
		Reply:         reply,
		RepliedAt:     repliedAt,
		HasAuthor:     hasAuthor,
	})
}

type User struct {
	// BilibiliUID is the internal account id. It is no longer a B 站 uid: local
	// accounts get a generated one and the column name is kept for compatibility
	// with existing databases.
	BilibiliUID    int64  `gorm:"primaryKey;autoIncrement:false" json:"-"`
	Username       string `gorm:"size:32;uniqueIndex;not null" json:"username"`
	PasswordHash   string `gorm:"size:255;not null" json:"-"`
	BilibiliName   string `gorm:"size:255;not null" json:"bilibili_name"`
	BilibiliAvatar string `gorm:"size:1024;not null" json:"bilibili_avatar"`
	// DisplayID is the public id the member sets for themselves.
	DisplayID            string    `gorm:"size:64" json:"display_id"`
	DisplayIsBilibiliUID *bool     `json:"display_is_bilibili_uid,omitempty"`
	VerifiedAt           time.Time `gorm:"not null" json:"verified_at"`
	IsDisabled           bool      `gorm:"index;not null;default:false" json:"is_disabled"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type LikeRecord struct {
	BaseModel
	IP         string   `gorm:"uniqueIndex:idx_like_records_ip_question" json:"ip"`
	QuestionID int      `gorm:"uniqueIndex:idx_like_records_ip_question" json:"question_id"`
	Question   Question `json:"question"`
}

type Admin struct {
	BaseModel
	Username string `gorm:"unique" json:"username"`
	Password string `json:"-"`
}

type Config struct {
	BaseModel
	Announcement              string `json:"announcement"`
	RequireVerifiedUserToPost bool   `gorm:"not null;default:false" json:"require_verified_user_to_post"`
	DeepSeekAPIKey            string `json:"-"`
	SpamPrompt                string `gorm:"type:text" json:"-"`
}

func (t Tag) Json() map[string]interface{} {
	var count int64
	DB.Model(&Question{}).Where("tag_id = ?", t.ID).Count(&count)
	return map[string]interface{}{
		"id":             t.ID,
		"tag_name":       t.TagName,
		"description":    t.Description,
		"question_count": count,
		"created_at":     t.CreatedAt,
	}
}

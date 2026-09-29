const API_BASE = '/api';

export interface Tag {
  id: number;
  tag_name: string;
  description: string;
  question_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmojiData {
  value: string;
  count: number;
}

export interface Question {
  id: number;
  tag_id: number;
  tag: Tag;
  content: string;
  images: string;
  images_num: number;
  is_hide: boolean;
  is_rainbow: boolean;
  is_archive: boolean;
  is_publish: boolean;
  is_spam: boolean;
  is_real_name: boolean;
  display_id?: string;
  display_is_bilibili_uid?: boolean;
  bilibili_name?: string;
  bilibili_avatar?: string;
  emojis: string;
  likes: number;
  created_at: string;
  updated_at: string;
  // Only present for the question author and for administrators.
  reply?: string;
  replied_at?: string;
}

export interface Config {
  announcement: string;
  require_verified_user_to_post: boolean;
}

export interface AccountUser {
  username: string;
  bilibili_uid: string;
  display_id: string;
  display_is_bilibili_uid?: boolean;
  bilibili_name: string;
  bilibili_avatar: string;
  verified_at: string;
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  bytesPerSecond: number;
  secondsRemaining: number | null;
}

export class UploadError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
  }
}

// fetch cannot report upload progress, so uploads go through XHR instead.
function uploadFormData(
  path: string,
  formData: FormData,
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<unknown>> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${API_BASE}${path}`, true);
    request.withCredentials = true;
    const startedAt = Date.now();

    request.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable || event.total <= 0) return;
      const elapsed = Math.max((Date.now() - startedAt) / 1000, 0.05);
      const bytesPerSecond = event.loaded / elapsed;
      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
        bytesPerSecond,
        secondsRemaining:
          bytesPerSecond > 0
            ? Math.max(0, Math.ceil((event.total - event.loaded) / bytesPerSecond))
            : null,
      });
    };

    request.onload = () => {
      let payload: ApiResponse<unknown> | null = null;
      try {
        payload = JSON.parse(request.responseText) as ApiResponse<unknown>;
      } catch {
        payload = null;
      }
      if (!payload) {
        reject(new UploadError('上传失败', request.status));
        return;
      }
      resolve(payload);
    };
    request.onerror = () => reject(new UploadError('网络异常，上传失败', 0));
    request.ontimeout = () => reject(new UploadError('上传超时', 0));
    request.onabort = () => reject(new UploadError('上传已取消', 0));

    request.send(formData);
  });
}

export interface QuestionsResponse {
  questions: Question[];
  page: number;
  page_size: number;
  total: number;
}

export async function getInfo(): Promise<ApiResponse<{ id: number; username: string }>> {
  const res = await fetch(`${API_BASE}/info`, {
    method: 'GET',
    credentials: 'include',
  });
  return res.json();
}

export async function getConfig(): Promise<ApiResponse<Config>> {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'GET',
    credentials: 'include',
  });
  return res.json();
}

export async function getAccountInfo(): Promise<ApiResponse<AccountUser>> {
  const res = await fetch(`${API_BASE}/account/info`, { credentials: 'include' });
  return res.json();
}

export async function loginAccount(username: string, password: string): Promise<ApiResponse<AccountUser>> {
  const res = await fetch(`${API_BASE}/account/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function logoutAccount(): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE}/account/logout`, { method: 'POST', credentials: 'include' });
  return res.json();
}

export async function registerAccount(username: string, password: string): Promise<ApiResponse<AccountUser>> {
  const res = await fetch(`${API_BASE}/account/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function updateAccountProfile(displayId: string, isBilibiliUid: boolean): Promise<ApiResponse<AccountUser>> {
  const res = await fetch(`${API_BASE}/account/profile`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_id: displayId, display_is_bilibili_uid: isBilibiliUid }),
  });
  return res.json();
}

export async function uploadAccountAvatar(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<AccountUser>> {
  const formData = new FormData();
  formData.append('file', file);
  return (await uploadFormData('/account/avatar', formData, onProgress)) as ApiResponse<AccountUser>;
}

export async function changeAccountPassword(oldPassword: string, newPassword: string): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE}/account/password`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  return res.json();
}

export async function fetchBilibiliAvatar(bilibiliUid: string): Promise<ApiResponse<{ profile: AccountUser; name: string }>> {
  const res = await fetch(`${API_BASE}/account/avatar/bilibili`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bilibili_uid: bilibiliUid }),
  });
  return res.json();
}

export async function getQuestions(params: {
  page?: number;
  size?: number;
  order_by?: string;
  order?: string;
  tag_id?: number;
  publish?: boolean;
  rainbow?: boolean;
  archive?: boolean;
  search?: string;
}): Promise<ApiResponse<QuestionsResponse>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.size) searchParams.set('size', params.size.toString());
  if (params.order_by) searchParams.set('order_by', params.order_by);
  if (params.order) searchParams.set('order', params.order);
  if (params.tag_id) searchParams.set('tag_id', params.tag_id.toString());
  if (params.publish !== undefined) searchParams.set('publish', params.publish.toString());
  if (params.rainbow !== undefined) searchParams.set('rainbow', params.rainbow.toString());
  if (params.archive !== undefined) searchParams.set('archive', params.archive.toString());
  if (params.search) searchParams.set('search', params.search);

  const res = await fetch(`${API_BASE}/question?${searchParams.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });
  return res.json();
}

export async function createQuestion(
  data: FormData,
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<null>> {
  return (await uploadFormData('/question', data, onProgress)) as ApiResponse<null>;
}

export async function updateQuestion(id: number, data: {
  tag_id?: number;
  is_hide?: boolean;
  is_rainbow?: boolean;
  is_archive?: boolean;
  is_publish?: boolean;
}): Promise<ApiResponse<null>> {
  const res = await fetch(`${API_BASE}/question/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function addEmoji(questionId: number, emoji: string): Promise<ApiResponse<null>> {
  const formData = new FormData();
  formData.append('emoji', emoji);
  const res = await fetch(`${API_BASE}/question/${questionId}/emoji`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return res.json();
}

export async function getMyQuestions(): Promise<ApiResponse<{ questions: Question[] }>> {
  const res = await fetch(`${API_BASE}/account/questions`, {
    method: 'GET',
    credentials: 'include',
  });
  return res.json();
}

export async function getTags(): Promise<ApiResponse<Tag[]>> {
  const res = await fetch(`${API_BASE}/tag`, {
    method: 'GET',
    credentials: 'include',
  });
  return res.json();
}

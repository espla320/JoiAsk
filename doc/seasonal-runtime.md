# Seasonal Runtime

可扩展的季节 / 节日装扮运行时。当前附带一个配置驱动的前端日历数据源；未来接入
`seasonal-scheduler` / `seasonal-admin` 后，只需替换 `ThemeSource`，渲染层无需修改。

## 数据流

```
ThemeSource ──snapshot──▶ SeasonalProvider ──▶ resolveSeasonalState ──▶ SeasonalScene
                                  │                       │
                                  │                       └──▶ SeasonalSlot
                                  └── 访客偏好 / Reduced Motion / 开发预览
```

- `ThemeSource`：当前默认使用 `SeasonalCalendarSource` 按日期提供秋季 / 周年主题；也保留
  `StaticThemeSource` 供固定主题和测试使用。
- `registry`：静态白名单，只接受显式注册的本地主题 manifest；未知 id 一律回退 `none`。
- `resolveSeasonalState`：纯函数，负责校验 snapshot、查表、合并访客偏好与系统 Reduced Motion。
- `SeasonalProvider`：全站唯一状态源，负责读取数据源、持久化偏好、开发预览和根节点属性
  `data-seasonal-theme` / `data-seasonal-renderer` / `data-seasonal-motion` 以及只读季节色变量。
- `SeasonalScene`：唯一的全局装饰层（`position: fixed; z-index: -1; pointer-events: none`），
  画布背景之上、页面内容之下，不会遮挡 Navbar、卡片或弹窗。
- `SeasonalSlot`：局部装饰插槽，只有主题 manifest 声明且组件已显式注册时才会渲染。

## 目录

```
frontend/src/features/seasonal/
├── types.ts                 数据契约
├── theme-ids.ts             主题 id 常量
├── registry.ts              主题白名单 + Demo 主题
├── resolve.ts               纯解析函数
├── schedule.ts              简单的年度 / 固定日期排期配置
├── schedule-resolver.ts     通用优先级、跨年与边界解析器
├── source.ts                Static / Calendar / Anniversary ThemeSource
├── themes/                  主题 manifest 与素材配置
├── storage.ts               localStorage 偏好封装
├── seasonal-provider.tsx    Provider / useSeasonal
├── seasonal-scene.tsx       全局装饰层
├── seasonal-slot.tsx        局部插槽
├── seasonal-root.tsx        客户端入口（Provider + Scene）
├── seasonal.css             全部 --seasonal-* 样式
├── effects/                 效果注册表 + Demo 花瓣
├── slots/                   插槽组件
└── __tests__/               纯逻辑测试
```

## 开发环境预览

预览只在开发环境（`next dev`）生效，生产构建会忽略该参数：

```
http://localhost:3000/?seasonalPreview=demo
http://localhost:3000/?seasonalPreview=anniversary-2026
http://localhost:3000/?seasonalPreview=early-fall
http://localhost:3000/?seasonalPreview=late-fall
```

- `?seasonalPreview=none` 或删除参数即可恢复无主题状态。
- 未注册的 id 会被忽略并保持 `none`。
- 也可以通过 `useSeasonal().setPreviewTheme("demo")` / `setPreviewTheme(null)` 切换。

## 访客偏好

`useSeasonal()` 提供：

- `preferences.decorationsEnabled` + `setDecorationsEnabled(false)`：完全关闭装扮。
- `preferences.motion` + `setMotion("full" | "reduced" | "off")`：控制动画等级；`off` 保留静态装饰。
- 系统 `prefers-reduced-motion` 会在 `full` 时自动降级为 `reduced`。

导航栏右侧在主题可用时会显示「节日装扮设置」（星形图标）：访客可以关闭全部装扮，或把动画切换为
完整 / 减少 / 关闭。主题为 `none` 时该入口不渲染，默认外观不受影响。

偏好保存在 `joiask:seasonal:preferences:v1`，localStorage 不可用或内容损坏时自动回退默认值。

## 添加主题

与现有视觉族相同的主题（例如第三个秋季阶段）只需要：

1. 在 `theme-ids.ts` 增加 id。
2. 在对应的 `themes/*.ts` 增加 manifest 和本地素材配置，并复用 `renderer: "fall"`。
3. 如需自动排期，在 `schedule.ts` 的 `SEASONAL_SCHEDULES` 增加年度或固定窗口。

只有全新的视觉体系才需要在 `types.ts` 增加 renderer/effect 白名单，并在 `effects/`、`slots/`
及其注册表中增加按需加载组件。远程资源和任意组件注入仍不允许。

年度窗口使用北京时间月/日，支持跨年范围；固定活动使用完整时间戳。窗口重叠时 `priority`
较高者生效，resolver 同时返回最近的 `nextTransitionAt`。

## 内置周年主题

`anniversary-2026` 主题（2026 周年纪念）在以下时间生效：

```
2026-10-31T00:00:00+08:00 ≤ now < 2026-11-02T00:00:00+08:00
```

也就是北京时间 2026 年 10 月 31 日和 11 月 1 日两个完整自然日。采用左闭右开区间，
避免最后一毫秒的边界歧义；窗口结束后由日历数据源恢复当时的季节主题（独立使用
`AnniversaryThemeSource` 时回退到 `none`）。页面跨越结束时间保持打开时，Provider 会在
`nextTransitionAt` 到达后自动刷新主题状态。

周年素材位于 `frontend/public/seasonal/anniversary/`，优先使用 WebP，并保留 PNG
后备资源。移动端会减少背景和局部装饰，所有装饰都不接收指针事件。

## 内置秋季主题

秋季作为两个独立主题注册，不使用 `variantId`：

- `early-fall`：北京时间每年 9 月 1 日 00:00 至 10 月 15 日 00:00。
- `late-fall`：北京时间每年 10 月 15 日 00:00 至 12 月 1 日 00:00。

周年主题的固定窗口优先于秋季主题；窗口结束后会自动恢复 `late-fall`。秋季素材位于
`frontend/public/seasonal/fall/`，桌面端显示枝条、艺术字、角饰和少量飘落素材，移动端自动减少
粒子和大型装饰。动画关闭后仍保留静态主题角饰。两个主题共享 `fall` renderer，各自的素材、
构图和 manifest 集中在 `themes/fall.ts`。

## 换成 Go API 数据源

实现 `ThemeSource` 接口即可，Provider 无需修改：

```ts
class HttpThemeSource implements ThemeSource {
  async getSnapshot(signal?: AbortSignal) {
    const response = await fetch('/api/seasonal', { signal, cache: 'no-store' });
    return response.json(); // { version: 1, themeId, effectsEnabled, ... }
  }
}
```

`resolveSeasonalState` 会校验版本、字段类型和主题 id；请求失败、未知主题或旧版本数据都会安全回退到 `none`。

## 测试与约束

```bash
cd frontend
npm run test:seasonal   # 纯逻辑：registry / resolve / preferences
npm run lint
npm run build           # 仍是 output: 'export' 静态导出
```

约束：

- 不覆盖 `--background`、`--foreground`、`--primary`、`--card`、`--fabric-*` 等现有 token。
- 不支持远程 JS/CSS 或任意组件注入；主题与效果只能来自本地显式注册。
- `SeasonalScene` 全站只挂载一次；`post-card-corner` 等插槽不得修改 PostCard 的 transform。

# Seasonal Runtime

可扩展的季节 / 节日装扮运行时。它**只负责渲染**：节日排期、优先级和管理员配置属于后续的
`seasonal-scheduler` / `seasonal-admin`，本模块只接收已经解析好的主题状态。

## 数据流

```
ThemeSource ──snapshot──▶ SeasonalProvider ──▶ resolveSeasonalState ──▶ SeasonalScene
                                  │                       │
                                  │                       └──▶ SeasonalSlot
                                  └── 访客偏好 / Reduced Motion / 开发预览
```

- `ThemeSource`：当前默认使用 `AnniversaryThemeSource` 按日期提供周年主题；也保留
  `StaticThemeSource` 供固定主题和测试使用。
- `registry`：静态白名单，只接受显式注册的本地主题 manifest；未知 id 一律回退 `none`。
- `resolveSeasonalState`：纯函数，负责校验 snapshot、查表、合并访客偏好与系统 Reduced Motion。
- `SeasonalProvider`：全站唯一状态源，负责读取数据源、持久化偏好、开发预览和根节点属性
  `data-seasonal-theme` / `data-seasonal-motion`。
- `SeasonalScene`：唯一的全局装饰层（`position: fixed; z-index: -1; pointer-events: none`），
  画布背景之上、页面内容之下，不会遮挡 Navbar、卡片或弹窗。
- `SeasonalSlot`：局部装饰插槽，只有主题 manifest 声明且组件已显式注册时才会渲染。

## 目录

```
frontend/src/features/seasonal/
├── types.ts                 数据契约
├── registry.ts              主题白名单 + Demo 主题
├── resolve.ts               纯解析函数
├── schedule.ts              周年主题日期窗口
├── source.ts                StaticThemeSource / AnniversaryThemeSource
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

## 添加一个主题（例如 Halloween）

1. 在 `effects/` 新增效果组件（CSS/SVG，限制粒子数量，`aria-hidden`，只动画 `transform` / `opacity`）。
2. 在 `types.ts` 的 `SEASONAL_EFFECT_IDS` 中加入 effect id，并在 `effects/effect-registry.ts`
   用 `next/dynamic` 注册（保持按需加载）。
3. 如有局部装饰，在 `types.ts` 的 `SEASONAL_SLOT_NAMES` 中选用既有 slot，并在
   `seasonal-slot.tsx` 的 `SLOT_REGISTRY` 中注册对应组件。
4. 在 `registry.ts` 中 `registerTheme({ id, name, category, tokens, backgroundAsset, slots, effects })`。
   `backgroundAsset` 必须是打包在 `public/` 下的本地路径，不能是远程 URL。
5. 主题状态由未来的调度器（或 `seasonalPreview` 预览）通过 `SeasonalSnapshot` 提供。

## 内置周年主题

`anniversary-2026` 主题（2026 周年纪念）在以下时间生效：

```
2026-10-31T00:00:00+08:00 ≤ now < 2026-11-02T00:00:00+08:00
```

也就是北京时间 2026 年 10 月 31 日和 11 月 1 日两个完整自然日。采用左闭右开区间，
避免最后一毫秒的边界歧义；窗口结束后安全回退到 `none`。页面跨越结束时间保持打开时，
Provider 会在 `nextTransitionAt` 到达后自动刷新主题状态。

周年素材位于 `frontend/public/seasonal/anniversary/`，优先使用 WebP，并保留 PNG
后备资源。移动端会减少背景和局部装饰，所有装饰都不接收指针事件。

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

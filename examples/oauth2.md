---
title: OAuth 2.0 授权码与 PKCE 协议全景
subtitle: 现代 Web 与移动应用的标准授权流程、安全防御及核心指标
layout: canvas
theme: slate
cols: 3
source: RFC 7636 / RFC 6749
badge: Security
---
OAuth 2.0 授权码模式（Authorization Code Flow）配合 PKCE 扩展，是目前公认最安全的跨系统授权方案。通过客户端换取短期 Access Token，避免向第三方应用暴露用户凭据。

## 1. 核心授权时序 {span=2 rows=1 badge="交互链路"}
```sequence num
participants: 用户终端, 前端应用, 授权中心, 资源API
用户终端 -> 前端应用: 触发登录 (生成 code_verifier & code_challenge)
前端应用 -> 授权中心: 重定向 /authorize?code_challenge=S256
授权中心 -> 用户终端: 展示登录与权限确认页面
用户终端 -> 授权中心: 提交凭据并确认授权
授权中心 --> 前端应用: 回调 /callback?code=AUTH_CODE
前端应用 -> 授权中心: POST /token (code + code_verifier)
note 授权中心: 校验 code_verifier 与 hash 匹配
授权中心 --> 前端应用: 返回 access_token & refresh_token
前端应用 -> 资源API: 请求数据 (Bearer access_token)
资源API --> 前端应用: 200 OK 返回受保护资源
```

## 2. 核心架构与验证 {span=1 rows=1 badge="状态机"}
```flow TD
[客户端发起] -> {PKCE 验证}: 生成挑战码
{PKCE 验证} -> [授权端点]: code_challenge
[授权端点] -> {凭据确认}: 用户登录
{凭据确认} -> *发放令牌*: 验签通过
{凭据确认} --> [拒绝 403]: 授权失败
```

## 3. 关键配置与性能指标 {span=1 rows=1}
```kv cols=1
Access Token 有效期: 7200 秒 (2 小时)
Refresh Token 策略: 单次轮换 (Rotation)
哈希算法: SHA-256 (S256 强制)
Code 兑换窗口: 60 秒内有效
```

## 4. 授权模式选型对比 {span=2 rows=1 badge="架构选型"}
```compare
授权场景 | 授权码 + PKCE | 密码凭据模式 (Deprecated) | 客户端凭证模式 (Client Credentials)
适用主体 | 单页应用 / 原生移动 App | 内部受信旧系统 | 服务端之间机器调用
安全评级 | ok 业界最高标准 (RFC 7636) | no 禁止在公网应用使用 | ok 仅限无用户参与的后台任务
防重放与拦截 | ok 强制 SHA-256 验证 | no 无防篡改机制 | warn 依赖 mTLS 或 Secret 保护
```

## 5. 安全防护准则 {span=1 rows=1}
```callout warn 严禁泄露 Token
严禁将 Access Token 存储于 LocalStorage。单页应用建议存储于内存或利用具有 HttpOnly、Secure 和 SameSite=Lax 属性的 Cookie 传输。
```

## 6. 参数与协议支持 {span=2 rows=1}
| 参数名 | 传输端点 | 必选性 | 说明 |
|---|---|---|---|
| response_type | /authorize | ok 必填 | 固定填 code |
| code_challenge | /authorize | ok 必填 | 客户端生成的随机串 SHA-256 摘要 |
| code_verifier | /token | ok 必填 | 换取 Token 时提交的原始随机密钥 |
| redirect_uri | /authorize & /token | ok 必填 | 必须与注册白名单严格一致 |
| client_secret | /token | warn 可选 | 纯前端或移动端公开客户端不应携带 |

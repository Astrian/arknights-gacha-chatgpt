import Debug from 'debug'
import koa from 'koa'
import koaBody from 'koa-body'
import route from 'koa-route'
import serve from 'koa-static-server'
import cors from '@koa/cors'
import axios from 'axios'
import dotenv from 'dotenv'
import func from './func'

const print = Debug('agc:app')
dotenv.config()

const app = new koa()
app.use(koaBody())

app.use(cors({
  origin: 'https://chat.openai.com'
}))

app.use(serve({ rootDir: 'static', rootPath: '/static' }))

app.use(route.get('/.well-known/ai-plugin.json', async ctx => {
  print(ctx.request)
  ctx.body = {
    "schema_version": "v1",
    "name_for_human": "PRTS Chatter",
    "name_for_model": "prtschatter",
    "description_for_human": "Obtain your Arknights game account data (Chinese server only).",
    "description_for_model": "Obtain your Arknights game account data (Chinese server only).",
    "auth": {
      "type": "oauth",
      "client_url": process.env.FRONTEND_DOMAIN,
      "scope": "openid",
      "authorization_url": `${process.env.SELF_DOMAIN}/provider/token/`,
      "authorization_content_type": "application/json",
      "verification_tokens": {
        "openai": process.env.OPENAI_API_VERIFICATION
      }
    },
    "api": {
      "type": "openapi",
      "url": `${process.env.SELF_DOMAIN}/static/ai-plugin-api.yaml`,
      "is_user_authenticated": true
    },
    "logo_url": "https://web.hycdn.cn/arknights/official/static/share.19269d4d9c628de755a2.jpg",
    "contact_email": "happy.wheel6743@astrian.moe",
    "legal_info_url": "https://github.com/Astrian/arknights-gacha-chatgpt"
  }
}))

app.use(route.get('/.well-known/ai-plugin-api.yaml', async ctx => {
  print(ctx.request)
  ctx.set('Content-Type', 'text/yaml; charset=utf-8')
  ctx.body = `openapi: 3.0.1
  info:
    title: PRTS Chatter
    description: Obtain your Arknights game account data (Chinese server only)
    version: 'v1'
  servers:
    - url: ${process.env.SELF_DOMAIN}
  paths:
    /provider/gacha:
      get:
        operationId: getGachaResult
        summary: Get recent gacha result
        responses:
          "200":
            description: OK
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/gachaResult'
  components:
    schemas:
      gachaResult:
        type: array
        items:
          type: object
          properties:
            ts:
              type: integer
              description: Timestamp of the gacha
            pool:
              type: string
              description: Gacha pool, which means the collection of operators (characters)
            chars:
              type: array
              description: Gacha result. Player may have 1-time gacha or 10-times gacha at a time, one “chars” item means one gacha
              items:
                type: object
                description: Gacha result, indicates an operator (character)
                properties:
                  name: 
                    type: string
                    description: Operator name
                  rarity:
                    type: integer
                    description: Operator rarity, 1(-star) means most common, 6(-star) means most rare
                  isNew:
                    type: boolean
                    description: This operator is newly obtained by this player if true`
}))

app.use(route.get('/provider/gacha', async ctx => {
  print(ctx.request.headers.authorization)
  // Get authentication header
  const auth = ctx.request.headers.authorization
  const token = auth?.split(' ')[1]
  // encode uri
  const encodedToken = encodeURIComponent(token ?? '')

  print(`Token: ${encodedToken}`)

  let gachaList: Gacha[] = []
  for (let i = 1; i <= 3; i++){
    
    const res = await axios.get(`https://ak.hypergryph.com/user/api/inquiry/gacha?page=${i}&token=${encodedToken}&channelId=1`)
    print(res.data)
    gachaList = gachaList.concat(res.data.data.list)
  }
  for (let i in gachaList) {
    for (let j in gachaList[i].chars) {
      gachaList[i].chars[j].rarity = gachaList[i].chars[j].rarity + 1
    }
  }
  print(ctx.request)
  ctx.header['content-type'] = 'application/json'
  ctx.body = gachaList
}))

app.use(route.post('/provider/token/verify_result', async ctx => {
  print(ctx.request)
  const auth = ctx.request.headers.authorization
  const token = auth?.split(' ')[1]
  print(`Token: ${token}`)
  try {
    const res = await axios.post(`https://as.hypergryph.com/u8/user/info/v1/basic`, {
      appId: 1,
      channelMasterId: 1,
      channelToken: {
        token
      }
    }, {
      headers: {
        'User-Agent': 'RapidAPI/4.2.0 (Macintosh; OS X/13.3.1) GCDHTTPRequest'
      }
    })
    print(res)
    ctx.header['content-type'] = 'application/json'
    ctx.body = res.data
  } catch (e: any) {
    print(e)
    ctx.status = 401
    ctx.body = {msg: "Invalid token"}
  }
}))

app.use(route.post('/provider/client', async ctx => {
  try {
    // check client_name
    if (!ctx.request.body.client_name) throw ({ message: "client_name is required", status: 400 })
    // check callback
    if (!ctx.request.body.callback) throw ({ message: "callback is required", status: 400 })
    // check callback is url
    if (!ctx.request.body.callback.match(/^https?:\/\/.+/)) throw ({ message: "callback must be url", status: 400 })
    ctx.body = (await func.create_client(ctx.request.body.client_name, ctx.request.body.callback))
    ctx.status = 200
  } catch (e: any) {
    print(e)
    ctx.status = e.status ?? 500
    ctx.body = {msg: e.message ?? "Internal Server Error"}
  }
}))

app.use(route.post('/provider/auth_code', async ctx => {
  try {
    const { client_id, redirect_uri, response_type, scope, token } = ctx.request.body
    let { code_challenge_method, code_challenge, nonce } = ctx.request.body
    // Check their existence and make sure they are not array
    if (!client_id) throw ({ message: "client_id is required", status: 400 })
    if (!redirect_uri) throw ({ message: "redirect_uri is required", status: 400 })
    if (!response_type) throw ({ message: "response_type is required", status: 400 })
    if (!scope) throw ({ message: "scope is required", status: 400 })
    // code_challenge can be empty
    if (!code_challenge_method) code_challenge_method = ''
    if (!code_challenge) code_challenge = ''
    if (!nonce) nonce = ''
    if (Array.isArray(client_id)) throw ({ message: "client_id must not be array", status: 400 })
    if (Array.isArray(redirect_uri)) throw ({ message: "redirect_uri must not be array", status: 400 })
    if (Array.isArray(response_type)) throw ({ message: "response_type must not be array", status: 400 })
    if (Array.isArray(scope)) throw ({ message: "scope must not be array", status: 400 })
    // if (Array.isArray(code_challenge_method)) throw ({ message: "code_challenge_method must not be array", status: 400 })
    // if (Array.isArray(code_challenge)) throw ({ message: "code_challenge must not be array", status: 400 })

    if (code_challenge_method !== 'S256' && code_challenge_method !== "") throw ({ message: "code_challenge_method not supported", status: 400 })

    // scope will only support openid, offline_access, email
    // They can be combined with space
    scope.split(' ').forEach((s: string) => {
      if (!['openid'].includes(s)) throw ({ message: "scope not supported", status: 400 })
    })
    // scope must contain openid
    if (!scope.split(' ').includes('openid')) throw ({ message: "scope must contain openid", status: 400 })

    // response_type will only support "code"
    if (response_type !== "code") throw ({ message: "response_type not supported", status: 400 })

    let auth_code = await func.auth_code(client_id, redirect_uri, scope, token, code_challenge, nonce)
    // set jwt header
    // res.set('Authorization', `Bearer ${auth_code.jwt_header}`)
    ctx.body = { auth_code }
  } catch (e: any) {
    print(e)
    ctx.status = e.status ?? 500
    ctx.body = {msg: e.message ?? "Internal Server Error"}
  }
}))

app.use(route.post('/provider/token', async ctx => {
  const { grant_type, code, redirect_uri } = ctx.request.body
  let { code_verifier, nonce } = ctx.request.body
  let authorization = ctx.request.headers.authorization
  if (!authorization) {
    // it may put into the body
    if (ctx.request.body.client_id && ctx.request.body.client_secret) {
      authorization = `Basic ${Buffer.from(`${ctx.request.body.client_id}:${ctx.request.body.client_secret}`).toString('base64')}`
    } else {
      ctx.body = { msg: 'authorization is required' }
      return ctx.status = 400
    }
  }
  if (!grant_type) {
    ctx.body = { msg: 'grant_type is required' }
    return ctx.status = 400
  }
  if (grant_type !== 'authorization_code') {
    ctx.body = { msg: 'grant_type not supported' }
    return ctx.status = 400
  }
  if (!code) {
    ctx.body = { msg: 'code is required' }
    return ctx.status = 400
  }
  if (!redirect_uri) {
    ctx.body = { msg: 'redirect_uri is required' }
    return ctx.status = 400
  }
  if (!code_verifier) code_verifier = ""
  if (!nonce) nonce = ""
  try {
    const token = await func.token(code, redirect_uri, code_verifier, authorization, nonce)
    ctx.body = token.body
  } catch (e: any) {
    print(e)
    ctx.status = e.status
    ctx.body = { msg: e.message ?? "Internal Server Error" }
  }
}))

app.listen(process.env.PORT ?? 3000, () => print(`Server running on port ${process.env.PORT ?? 3000}`))

declare type Gacha = {
  ts: number
  pool: string
  chars: {
    name: string
    rarity: number
    isNew: boolean
  }[]
}
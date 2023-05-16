import Debug from 'debug'
import koa from 'koa'
import koaBody from 'koa-body'
import route from 'koa-route'
import serve from 'koa-static-server'
import cors from '@koa/cors'
import axios from 'axios'
import dotenv from 'dotenv'

const print = Debug('agc:app')
dotenv.config()

const app = new koa()
app.use(koaBody())

app.use(cors({
  origin: 'https://chat.openai.com',
}))

app.use(serve({rootDir: '.well-known', rootPath: '/.well-known'}))

app.use(route.get('/gacha', async ctx => {
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

// Issue auth code
/*app.use(route.post('/provider/auth_code', async ctx => {
  try {
    const { client_id, redirect_uri, response_type, scope } = ctx.body as { client_id: string, redirect_uri: string, response_type: string, scope: string }
    let { code_challenge_method, code_challenge, nonce } = ctx.body as { code_challenge_method: string, code_challenge: string, nonce: string }
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
      if (!['openid', 'offline_access', 'email', "profile"].includes(s)) throw ({ message: "scope not supported", status: 400 })
    })
    // scope must contain openid
    if (!scope.split(' ').includes('openid')) throw ({ message: "scope must contain openid", status: 400 })

    // response_type will only support "code"
    if (response_type !== "code") throw ({ message: "response_type not supported", status: 400 })

    
  } catch (e: any) {
    debug(e)
    res.status(e.status ?? 500).send({msg: e.message ?? "Internal Server Error"})
  }
})) */

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
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
  origin: (ctx: any) => {
    const allowedOrigins = ['https://chat.openai.com', 'http://localhost:5173'];
    const origin = ctx.request.headers.origin;
    if (allowedOrigins.includes(origin ?? '')) {
      return origin;
    }
    return '';
  }
}))

app.use(serve({rootDir: '.well-known', rootPath: '/.well-known'}))

app.use(route.get('/provider/gacha', async ctx => {
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
  const auth = ctx.request.headers.authorization
  const token = auth?.split(' ')[1]
  const res = await axios.post(`https://as.hypergryph.com/u8/user/info/v1/basic`, {
    appId: 1,
    channelMasterId: 1,
    channelToken: {
      token: token
    }
  })
  ctx.header['content-type'] = 'application/json'
  ctx.body = res.data
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
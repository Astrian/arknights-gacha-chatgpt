import sqlite from '../util/sqlite'

import Debug from 'debug'
import bcrypt from 'bcrypt'

const debug = Debug('a3b:func:token_check')

export default async (authorization: string) => {
  // Extract authrization header from base64
  const [token_id, token_sec] = Buffer.from(authorization.split(' ')[1], 'base64').toString().split('.')
  
  // check if token_id and token_sec are valid
  const token = await sqlite.get("SELECT * FROM access_token WHERE id = ?", [token_id])
  if (!token) throw ({ message: "token_id not found", status: 400 })
  debug(token)
  debug
  if (!await bcrypt.compare(token_sec, token.secret)) throw ({ message: "token_sec does not match", status: 400 })

  // check if token is expired
  if (token.exp < Date.now()) throw ({ message: "token expired", status: 400 })

  // return user info and client info
  return {
    user_id: token.user_id,
    client_id: token.client_id,
    scope: token.scope
  }

}
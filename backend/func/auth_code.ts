import sqlite from '../util/sqlite'
import randomString from '../util/random_string'
import dovenv from 'dotenv'
import Debug from 'debug'

const debug = Debug('a3b:func:auth_code')

dovenv.config()

export default async (client_id: string, redirect_uri: string, scope: string, token: string, code_challenge: string, nonce: string)=> {
  const client = await sqlite.get("SELECT * FROM client WHERE id = ?", [client_id])
  if (!client) throw ({ message: "Client not found", status: 404 })
  debug(client)
  debug(redirect_uri)
  if (client.callback !== redirect_uri) throw ({ message: "Redirect URI does not match", status: 400 })
  // generate new auth code
  const auth_code = randomString(32)
  // check the auth_code has not been taken
  let auth_code_check = false
  debug(auth_code)
  do  {
    const auth_code_check_result = await sqlite.get("SELECT * FROM auth_code WHERE code = ?", [auth_code])
    if (!auth_code_check_result) auth_code_check = true
  } while (!auth_code_check)

  // insert auth_code
  await sqlite.run("INSERT INTO auth_code (code, client_id, scope, token, code_challenge, nonce) VALUES (?, ?, ?, ?, ?, ?)", [auth_code, client_id, scope, token, code_challenge, nonce])
  return auth_code
}
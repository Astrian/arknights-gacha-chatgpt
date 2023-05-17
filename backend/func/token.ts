import sqlite from '../util/sqlite'

import bcrypt from 'bcrypt'
import Debug from 'debug'
import crypto from 'crypto'
import dovenv from 'dotenv'

dovenv.config()

const debug = Debug('a3b:func:token')

export default async (code: string, redirect_uri: string, code_verifier: string, authorization: string, nonce: string) => {
  // Extract authrization header from base64
  const [client_id, client_secret] = Buffer.from(authorization.split(' ')[1], 'base64').toString().split(':')
  debug(client_id, client_secret)
  debug(nonce)

  // Check if client_id and client_secret are valid
  const client = await sqlite.get("SELECT * FROM client WHERE id = ?", [client_id])
  if (!client) throw ({ message: "client_id not found", status: 400 })
  if (!await bcrypt.compare(client_secret, client.secret)) throw ({ message: "client_secret not match", status: 400 })
  if (client.callback !== redirect_uri) throw ({ message: "redirect_uri not match", status: 400 })
  debug("pass client verification")

  // Check if code is valid, and get token
  let auth_code: any = null
  if (nonce === '') auth_code = await sqlite.get("SELECT * FROM auth_code WHERE code = ?", [code])
  else auth_code = await sqlite.get("SELECT * FROM auth_code WHERE code = ?, nonce = ?", [code, nonce])
  if (!auth_code) throw ({ message: "code not found", status: 400 })
  if (auth_code.client_id !== client_id) throw ({ message: "client_id not match", status: 400 })
  debug("pass code verification")
  const token = auth_code.token

  // Check if code_verifier is valid
  // S256 hash code_verifier, remove all '='
  if (code_verifier !== '') {
    const code_verifier_hashed = crypto.createHash('sha256').update(code_verifier).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    debug(code_verifier_hashed, auth_code.code_challenge)
    debug(code_verifier_hashed === auth_code.code_challenge)
    if (code_verifier_hashed !== auth_code.code_challenge) throw ({ message: "code_verifier not match", status: 400 })
  }

  // Delete auth_code
  await sqlite.run("DELETE FROM auth_code WHERE code = ?", [code])
  debug("auth_code deleted")

  return {
    body: {
      token_type: "Bearer",
      access_token: token
    }
  }
}
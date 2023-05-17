import sqlite from '../util/sqlite'
import dotenv from 'dotenv'
import Debug from 'debug'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import randomString from '../util/random_string'

const debug = Debug('a3b:func:create_client')

dotenv.config()

export default async (client_name: string, callback: string): Promise<{ client_secret: string, client_id: string }> => {
  if (process.env.ALLOW_CREATE_CLIENT !== "1") throw ({ message: "Not allowed to create client", status: 403 })
  const client_id = uuidv4()
  // create secret with random string
  const client_secret = randomString(32)
  // hash secret
  const hashed_client_secret = await bcrypt.hash(client_secret, 10)
  // insert client
  await sqlite.run("INSERT INTO client (id, secret, name, callback) VALUES (?, ?, ?, ?)", [client_id, hashed_client_secret, client_name, callback])
  return { client_secret, client_id }
}



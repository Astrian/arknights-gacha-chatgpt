import sqlite from '../util/sqlite'
import randomString from '../util/random_string'

import bcrypt from 'bcrypt'
import Debug from 'debug'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import dovenv from 'dotenv'
import { readFileSync } from 'fs'

dovenv.config()

const debug = Debug('a3b:func:token')

export default async (code: string, redirect_uri: string, code_verifier: string, authorization: string, nonce: string) => {
  

  return {}
}
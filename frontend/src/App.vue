<script setup lang="ts">
import { reactive } from 'vue'
import axios from 'axios'

const state = reactive({
  token: '',
  stage: 0,
  user_profile: {
    nickName: '',
  }
})

const paste = async (event: Event) => {
  try {
    state.token = ((JSON.parse((event.target as HTMLInputElement).value)) as {data: { content: string }}).data.content
  } catch (e) {
    alert('Invalid token!')
    return
  }
  state.stage = 1

  try {
    const res = await axios.post("http://localhost:3000/provider/token/verify_result", {}, {
      headers: {
        Authorization: `Bearer ${state.token}`
      }
    })
    if (res.data.status !== 0) {
      alert('Invalid token!')
      state.stage = 0
      return
    }
    console.log(res.data)
    state.user_profile = res.data.data
    state.stage = 2
  } catch (e) {
    alert('Invalid token!')
    state.stage = 0
    return
  }
  
}
</script>

<template>
  <div class="container">
    <div class="columns">
      <div class="column is-half is-offset-one-quarter main">
        <h1 class="title is-1">ArkChatter</h1>
        <p class="subtitle">Access your Arknights game data on generative AI chatbots.</p>
        <hr />
        <div v-if="state.stage === 0">
          <h2 class="title is-2">Authorise</h2>
          <p><b>Security Reminder:</b> Please confirm that you are getting into this page by the ChatGPT plugin/extension page, otherwise, it may be a fraud!</p>
          <hr />
          <h2 class="title is-3">Step 1</h2>
          <p>Login to your Hypergryph account <a href="https://ak.hypergryph.com/user" target="_blank">here</a>.</p>
          <hr />
          <h2 class="title is-3">Step 2</h2>
          <p>Obtain your token with <a href="https://web-api.hypergryph.com/account/info/hg" target="_blank">this link</a>. Copy all content from this page.</p>
          <hr />
          <h2 class="title is-3">Step 3</h2>
          <p>Paste your token below.</p>
          <div class="field">
            <label class="label for-screenreader">Token</label>
            <div class="control">
              <input class="input" type="text" placeholder="Paste your token here" @focusout="paste">
            </div>
          </div>
        </div>
        <div v-if="state.stage === 1">
          Checking your token...
        </div>
        <div v-if="state.stage === 2">
          <h2 class="title is-2">Welcome, {{ state.user_profile.nickName }}</h2>
          <p>You are about to authrize <b>ArkChatter</b> and <b>ChatGPT</b> to access your Hypergryph account, including:</p>
          <ul>
            <li>Basic personal information</li>
            <li>Headhunting (gacha) history</li>
            <li>Originium usage logs</li>
            <li>In-game purchase history</li>
          </ul>
          <p>You can revoke your authorise anytime by go to <a href="https://ak.hypergryph.com/user/home">Hypergryph account center</a> and click “清除其他设备的登录状态” (clear sessions on other devices).</p>
          <button class="button is-primary">Continue</button>
          <button class="button is-ghost" @click="state.stage = 0">No, it not me. Bring me back to login</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.main {
  margin-top: 50px;
}

.for-screenreader {
  display: none;
}
ul {
  margin-left: 20px;
  margin-bottom: 20px;
  list-style-type: disc;
}
p {
  margin-bottom: 20px;
}
</style>

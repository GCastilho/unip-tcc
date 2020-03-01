<script>
  import { onMount } from "svelte";
  import { goto } from "@sapper/app";
  import axios from "../utils/axios.js";
  import * as auth from "../stores/auth.js";
  import FancyInput from "../components/FancyInput.svelte";
  import FancyButton from "../components/FancyButton.svelte";
  import FormErrorMessage from "../components/FormErrorMessage.svelte";

  let errorMessage = undefined;

  onMount(() => {
    // Redireciona para home caso esteja autenticado
    //if ($auth) goto('/')
  });

  async function handleSubmit(event) {
    const passwordold = event.target.password_old.value;
    const passwordnew = event.target.password_new.value;
    const passwordconfirm = event.target.password_confirm.value;

    if (passwordnew == passwordconfirm) {
      try {
        const { token } = await axios.post(
          window.location + "/change-password",
          {
            passwordold,
            passwordnew
          }
        );
        /**
         * @todo Adicionar handlers para os erros vindos do sistema
         * de autenticação do websocket
         */
        //await auth.authenticate(token)

        /** Redireciona o usuário para a home */
        goto("/");
      } catch (err) {
        if (err.response.status === 401) {
          errorMessage = "Invalid email or password";
        } else {
          errorMessage = err.response.statusText;
        }
      }
    } else {
      errorMessage = "Passwords are different.";
    }
  }
</script>

<style>
  h1,
  p {
    text-align: center;
  }

  p {
    margin: 0;
    line-height: 1em;
    padding-bottom: 1em;
  }

  form {
    width: 350px;
    height: 100%;
    border: 1px solid lightgray;
    margin-top: 1.5em;
    margin-left: auto;
    margin-right: auto;
    padding: 20px;
    border-radius: 6px;
    box-shadow: 0px 5px 50px 0px rgba(18, 89, 93, 0.15);
    line-height: 50px;
  }
</style>

<h1>User</h1>
<form method="POST" on:submit|preventDefault={handleSubmit}>
  {#if errorMessage}
    <FormErrorMessage>{errorMessage}</FormErrorMessage>
  {/if}
  <p>Change Password</p>
  <FancyInput id="password_old" type="password">Old Password</FancyInput>
  <FancyInput id="password_new" type="password">New Password</FancyInput>
  <FancyInput id="password_confirm" type="password">
    Confirm Password
  </FancyInput>

  <FancyButton type="submit">Change</FancyButton>
</form>

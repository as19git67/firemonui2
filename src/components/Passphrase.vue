<template>
  <v-dialog
    value="true"
    :max-width="width"
    @input="change"
    @keydown.esc="choose(false)"
  >
    <v-toolbar
      v-if="Boolean(title)"
      dark
      :color="color"
      dense
    >
      <v-icon>vpn_key</v-icon>
      <v-toolbar-title
        class="white--text"
        v-text="title"
      />
    </v-toolbar>
    <v-card>
      <v-card-text v-html="message" />
      <v-card-text>
        <v-form
          :id="idForm"
          v-model="valid"
        >
          <v-text-field
            id="passphrase"
            v-model="passphrase"
            name="passphrase"
            :label="label"
            type="password"
            default
            autofocus
            browser-autocomplete="off"
            :rules="[rules.required, rules.strongPassword]"
            @keydown.enter="choose(true)"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          :color="buttonLeftColor"
          flat
          @click="choose(false)"
        >
          Abbrechen
        </v-btn>
        <v-btn
          :color="buttonRightColor"
          flat
          :disabled="!valid"
          @click="choose(true)"
        >
          {{ btnTextOk }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  export default {
    name: 'Passphrase',
    props: {
      idForm: {
        type: String,
        default: 'passphraseForm'
      },
      buttonRightColor: {
        type: String,
        default: 'primary'
      },
      btnTextOk: {
        type: String,
        default: 'Speichern'
      },
      buttonLeftColor: {
        type: String,
        default: 'grey'
      },
      color: {
        type: String,
        default: 'info'
      },
      message: {
        type: String,
        default: ''
      },
      title: {
        type: String,
        default: ''
      },
      label: {
        type: String,
        default: 'Passphrase'
      },
      width: {
        type: Number,
        default: 450
      },
      needStrongPassword: {
        type: Boolean,
        default: true
      }
    },
    data () {
      this.passphrase = ''
      this.valid = false
      return {
        valid: this.valid,
        value: false,
        passphrase: this.passphrase,
        rules: {
          required: value => !!value || 'Das Eingabefeld darf nicht leer bleiben',
          strongPassword: value => {
            // (?=(.*\d){2}) - uses lookahead (?=) and says the password must contain at least 2 digits
            // (?=.*[a-zA-Z]) - uses lookahead and says the password must contain an alpha
            // (?=.*[!@#$%]) - uses lookahead and says the password must contain 1 or more special characters which are defined
            // [0-9a-zA-Z!@#$%] - dictates the allowed characters
            // {15,} - says the password must be at least 8 characters long
            let p = /^(?=(.*\d){2})(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%öäüÖÄÜß#+*,;.:<>"§&/\\()[\]{}=?´`'^€~])[ 0-9a-zA-Z!@#$%öäüÖÄÜß#+*,;.:<>"§&/\\()[\]{}=?´`'^€~]{15,}/
            if (!this.needStrongPassword || p.test(value)) {
              return true
            } else {
              return 'Mindestens 15 Zeichen, große und kleine Buchstaben, sowie Sonderzeichen müssen enthalten sein'
            }
          }
        }
      }
    },
    methods: {
      choose (value) {
        this.value = value ? this.passphrase : ''
        this.$emit('result', this.value)
        this.$destroy()
      },
      change () {
        this.$destroy()
      }
    }
  }
</script>

<style scoped>

</style>

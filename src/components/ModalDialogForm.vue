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
      <v-toolbar-title
        class="white--text"
        v-text="title"
      />
    </v-toolbar>
    <v-card>
      <v-card-text v-if="Boolean(message)">
        {{ message }}
      </v-card-text>
      <v-card-text>
        <v-form
          :id="idForm"
          v-model="valid"
        >
          <div
            v-for="(field,index) in formData"
            :key="field.id"
          >
            <v-text-field
              v-if="index===0"
              :id="field.id"
              v-model.lazy="field.value"
              :name="field.id"
              :label="field.label"
              :rules="[rules.required]"
              default
              autofocus
            />
            <v-text-field
              v-if="index>0"
              :id="field.id"
              v-model.lazy="field.value"
              :name="field.id"
              :label="field.label"
              :rules="[rules.required]"
            />
          </div>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          :color="buttonLeftColor"
          text
          @click="choose(false)"
        >
          Abbrechen
        </v-btn>
        <v-btn
          :color="buttonRightColor"
          text
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
    name: 'ModalDialogForm',
    props: {
      idForm: {
        type: String,
        default: 'dataForm'
      },
      form: {
        type: Array,
        default: () => []
      },
      buttonRightColor: {
        type: String,
        default: 'primary'
      },
      btnTextOk: {
        type: String,
        default: 'Übernehmen'
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
        default: ''
      },
      width: {
        type: Number,
        default: 450
      }
    },
    data () {
      this.valid = false
      return {
        valid: this.false,
        formData: this.form,
        rules: {
          required: value => !!value || 'Das Eingabefeld darf nicht leer bleiben'
        }
      }
    },
    mounted () {
      this.formData = this.form
    },
    methods: {
      choose (ok) {
        if (!ok) {
          this.formData = []
        }
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

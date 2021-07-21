import Vue from 'vue'
import Router from 'vue-router'
import VueSession from 'vue-session'
import Login from '@/components/Login'
import List from '@/components/List'
import Alarm from '@/components/Alarm'
import SetupAuth from '@/components/SetupAuth'
import SetupAuth2 from '@/components/SetupAuth2'
import SetupAuth3 from '@/components/SetupAuth3'
import SetupAuth4 from '@/components/SetupAuth4'
import ManageUsers from '@/components/ManageUsers'
import ManageAccount from '@/components/ManageAccount'
import ManageGroups from '@/components/ManageGroups'
import ManageGroup from '@/components/ManageGroup'

Vue.use(Router)
Vue.use(VueSession, {persist: true})

const router = new Router({
  routes: [
    {
      path: '/',
      name: 'List',
      component: List
    },
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/setupauth',
      name: 'SetupAuth',
      component: SetupAuth
    },
    {
      path: '/setupauth2',
      name: 'SetupAuth2',
      component: SetupAuth2
    },
    {
      path: '/setupauth3',
      name: 'SetupAuth3',
      component: SetupAuth3
    },
    {
      path: '/setupauth4',
      name: 'SetupAuth4',
      component: SetupAuth4
    },
    {
      path: '/manageusers',
      name: 'ManageUsers',
      component: ManageUsers
    },
    {
      path: '/manageaccount',
      name: 'ManageAccount',
      component: ManageAccount
    },
    {
      path: '/managegroups',
      name: 'ManageGroups',
      component: ManageGroups
    },
    {
      path: '/managegroup',
      name: 'ManageGroup',
      component: ManageGroup
    },
    {
      path: '/alarm/:jobId',
      name: 'alarm',
      props: true,
      component: Alarm
    }
  ]
})

// router.beforeEach((to, from, next) => {
// const at = from.query.autotoken
// if (at && !to.query.autotoken) {
//   // delete from.query.autotoken
//   // next({path: to.path, query: {autotoken: at}})
//   to.query.autotoken = at
//   next()
// } else {
//   next()
// }
// })

router.beforeResolve((to, from, next) => {
  const at = from.query.autotoken
  if (at && to.path !== '/setupauth3' && !to.query.autotoken) {
    // delete from.query.autotoken
    next({path: to.path, query: {autotoken: at}})
    // to.query.autotoken = at
    // next()
  } else {
    next()
  }
})

export default router

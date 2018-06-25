import Plan from '../Plan'
import {Model} from '@orion-js/app'

const Item = new Model({
  name: 'StripeSubscriptionItem',
  schema: {
    plan: {
      type: Plan
    },
    created: {
      type: Date
    },
    quantity: {
      type: Number
    },
    subscription: {
      type: String
    }
  }
})

export default {
  id: {
    type: String
  },
  billing: {
    type: String
  },
  billing_cycle_anchor: {
    type: Date
  },
  cancel_at_period_end: {
    type: Boolean
  },
  canceled_at: {
    type: Date
  },
  created: {
    type: Date
  },
  current_period_end: {
    type: Date
  },
  current_period_start: {
    type: Date
  },
  customer: {
    type: String
  },
  days_until_due: {
    type: Number
  },
  ended_at: {
    type: Date
  },
  items: {
    type: [Item]
  },
  plan: {
    type: Plan
  }
}

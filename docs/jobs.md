---
id: jobs
title: Jobs
sidebar_label: Jobs
---

`Jobs` are pre-programmed background processes that can be scheduled to run after a certain period of time.

## Structure of the main jobs of the application

```
server
└── app
    └── jobs
        ├── job1
        │   └── index.js
        ├── job2
        └── index.js
```

## Example of the jobs directory index

```js
import {start} from '@orion-js/jobs'
import job1 from './job1'
import job2 from './job2'

start({job1, job2})
```

`start` makes the jobs declared inside valid and ready to be called.

Jobs can be called at any moment and make changes in the database. Let's take for example the next resolver:

```js
import {resolver} from '@orion-js/app'
import Orders from 'app/collections/Orders'
import checkDeliveryFromOrder from 'app/jobs/checkDeliveryFromOrder'

export default resolver({
  params: {
    orderId: {
      type: 'ID'
    }
  },
  returns: true,
  mutation: true,
  async resolve({orderId}, viewer) {
    const order = await Orders.findOne(orderId)
    const delivery = await order.delivery()
    if (delivery.status !== 'completed') {
      const oneDay = 1000 * 60 * 60 * 24
      checkDeliveryFromOrder({orderId}, {waitToRun: oneDay})
    }
    return true
  }
})
```

The resolver checks if a delivery asociated to an order has been completed. Since is still in its way, it calls the job `checkDeliveryFromOrder` with a time period equal to a day. This means that it will be executed 24 hours from now.

```js
import {job} from '@orion-js/jobs'
import Orders from 'app/collections/Orders'

export default job({
  type: 'event',
  async run({orderId}) {
    const order = await Orders.findOne(orderId)
    const delivery = await order.delivery()
    if (delivery.status === 'completed') {
      await order.update({$set: {status: 'delivered'}})
    } else {
      const threeDays = 1000 * 60 * 60 * 24 * 3
      this.runJob({orderId}, {waitToRun: threeDays})
    }
  }
})
```

`checkDeliveryFromOrder` receives the `orderId` parameter, and it checks again if the delivery has been completed. If by now the delivery has been completed, it updates `order.status = 'delivered'`. At contrary, it runs the job again, now with a time expectancy of 3 days.

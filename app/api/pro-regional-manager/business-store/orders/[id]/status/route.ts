// Reuse the Customer Door settlement and fulfilment safety checks; the shared
// handler authorizes a Pro Manager only after independent Pro activation.
export {POST} from '@/app/api/client/business-store/orders/[id]/status/route'

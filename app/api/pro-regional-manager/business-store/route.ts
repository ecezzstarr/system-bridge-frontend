// Pro Manager merchants reuse the actual Customer Door store with an original-role
// ownership check. Ordinary Regional Managers cannot access this route.
export {GET,POST,PATCH} from '@/app/api/client/business-store/route'

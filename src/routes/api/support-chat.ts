import {createFileRoute} from '@tanstack/react-router';
import {handleSupport} from '@/lib/support.server';
export const Route=createFileRoute('/api/support-chat')({staticData:{sitemap:false},server:{handlers:{POST:({request})=>handleSupport(request)}}});

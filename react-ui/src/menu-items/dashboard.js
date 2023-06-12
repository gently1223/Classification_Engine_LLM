// assets
import { IconDashboard, IconDeviceAnalytics, IconMessageChatbot } from '@tabler/icons';

// constant
const icons = {
    IconDashboard: IconDashboard,
    IconMessageChatbot: IconMessageChatbot,
    IconDeviceAnalytics
};

//-----------------------|| DASHBOARD MENU ITEMS ||-----------------------//

export const dashboard = {
    id: 'dashboard',
    title: '',
    type: 'group',
    children: [
        {
            id: 'default',
            title: 'Dashboard',
            type: 'item',
            url: '/dashboard',
            icon: icons['IconDashboard'],
            breadcrumbs: false,
            admin: 1
        },
        {
            id: 'train',
            title: 'TrainBoard',
            type: 'item',
            url: '/trainboard',
            icon: icons['IconMessageChatbot'],
            breadcrumbs: false,
            admin: 0
        },
        {
            id: 'classification',
            title: 'ClassificationBoard',
            type: 'item',
            url: '/classificationboard',
            icon: icons['IconMessageChatbot'],
            breadcrumbs: false,
            admin: 0
        },
    ]
};

/* eslint-disable no-unused-vars */
import '../scss/custom.scss'


import * as bootstrap from 'bootstrap'




import { sessionService } from './services/api/API.js';
// import { messageSocketService } from './services/api/GlobalSockHandler.js';
import router from './services/router.js';

// Components
import BsButton from './components/bootstrap/BsButton.js';
import { BsCard } from './components/bootstrap/BsCard.js';
import BsDropDown from './components/bootstrap/BsDropDown.js';
import BsModal from './components/bootstrap/BsModal.js';
import BsToasts from './components/bootstrap/BsToasts.js';
import AvatarComponent from './components/bootstrap/AvatarComponent.js';
import * as u from './components/utils.js';
import { VerticalNav } from './components/Navs.js';
import { ListGroup } from './components/AnimL';
import { ListCard } from './components/ListCard';
import { PageinatedListCard } from './components/PageinatedListCard';
import { ColorModeToggler } from './components/ColorModeToggler';
import { FileButton } from './routes/profile/FileButton';

// Routes Web Components
import TimerComp from './components/TimerComp';
import PongApp from './routes/root.js';
import LoginRegisterRoute from './routes/auth/LoginRegisterRoute.js';
import PongBg from './routes/auth/PongBg.js';
import GameWindow from './routes/home/GameWindow.js';
// import GameModalRemote from './routes/home/PongGame_remote.js';
import GameScreen from './routes/home/PongGame.js';
import { ProfileView } from './routes/profile/ProfileView.js';
import ProfileSearch from './routes/social/ProfileSearch.js';
import FriendsView from './routes/social/FriendsView.js';
import ChatView from './routes/social/ChatView.js';
import { SingleChatView } from './routes/social/SingleChatView';
import TournamentCreateView from './routes/home/tournament/TournamentCreateView.js';
import { TournamentDetailsView } from './routes/home/tournament/TournamentDetailsView.js';
import { SettingsView } from './routes/profile/SettingsView.js';
import { NotificationView } from './routes/notifications/NotificationView';
import { getPreferredTheme, setTheme } from './services/themeSwitcher';
import { VirtTest } from './lib_templ/virtualizer/Virtualizer';
import { TournamentListView } from './routes/home/tournament/TournamentListView';
import { PongInfoView } from './routes/home/pongInfo/PongInfoView';





const onDomLoaded = async () => {
    
        
    setTheme(getPreferredTheme());
    await sessionService.login();
    // await messageSocketService.init();
    console.log('DOM LOADED');
    await router.init('pong-app');
    // document.body.appendChild(document.createElement('pong-app'));
    // router.init("pong-app");
};

document.addEventListener('DOMContentLoaded', () => {
    onDomLoaded();
});

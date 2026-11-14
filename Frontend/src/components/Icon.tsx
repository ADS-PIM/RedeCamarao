import { config } from '@fortawesome/fontawesome-svg-core'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft, faArrowRight, faBars, faBasketShopping, faBookmark, faBox,
  faCalendarDays, faChevronDown, faCircleCheck, faCircleInfo, faClock,
  faCommentDots, faCopy, faEllipsis, faEye, faEyeSlash, faHandshake,
  faImages, faLocationDot, faMagnifyingGlass, faPause, faPenToSquare,
  faPhone, faPlay, faPlus, faRightFromBracket, faRulerCombined,
  faShareNodes, faShrimp, faSliders, faStore, faTableCellsLarge,
  faTrashCan, faWarehouse, faWater, faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import '@fortawesome/fontawesome-svg-core/styles.css'
import './Icon.css'

// Bundle only the imported icons and load their styles once with the application.
config.autoAddCss = false

const icons = {
  bag: faBasketShopping, store: faStore, farm: faWarehouse, shrimp: faShrimp,
  check: faCircleCheck, info: faCircleInfo, arrow: faArrowRight, 'arrow-left': faArrowLeft,
  menu: faBars, close: faXmark, eye: faEye, 'eye-off': faEyeSlash,
  search: faMagnifyingGlass, waves: faWater, sparkle: faShrimp, ruler: faRulerCombined,
  box: faBox, pin: faLocationDot, chat: faCommentDots, whatsapp: faWhatsapp,
  handshake: faHandshake, filters: faSliders, calendar: faCalendarDays,
  share: faShareNodes, bookmark: faBookmark, grid: faTableCellsLarge,
  edit: faPenToSquare, pause: faPause, play: faPlay, trash: faTrashCan,
  more: faEllipsis, copy: faCopy, plus: faPlus, images: faImages,
  logout: faRightFromBracket, chevron: faChevronDown, clock: faClock, phone: faPhone,
} satisfies Record<string, IconDefinition>

export type IconName = keyof typeof icons

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return <FontAwesomeIcon icon={icons[name]} className={`portal-icon${className ? ` ${className}` : ''}`} aria-hidden="true" focusable="false" />
}

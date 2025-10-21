import { AiOutlineFileAdd } from 'react-icons/ai';
import { BsFillInboxFill } from 'react-icons/bs';
import { FaRegFileAlt } from 'react-icons/fa';
import {
  MdChevronLeft,
  MdChevronRight,
  MdCloudUpload,
  MdFolder,
  MdLayers,
  MdLogout,
  MdOutlineMenuBook,
  MdSettings,
  MdSource,
} from 'react-icons/md';
import { TbBrain } from 'react-icons/tb';




export const SidebarIcons = {
  dashboard: FaRegFileAlt, // Dashboard (changed)
  ingestion: MdCloudUpload, // Content Ingestion
  sources: MdSource, // Content Sources
  workspaces: BsFillInboxFill, // Workspaces (changed)
  templates: MdOutlineMenuBook, // Prompt Templates
  settings: MdSettings, // Settings
  logout: MdLogout, // Logout
  chevronLeft: MdChevronLeft,
  chevronRight: MdChevronRight,
  agent: TbBrain,
  // fallback
  file: FaRegFileAlt,
  folder: MdFolder,
  upload: AiOutlineFileAdd,
  layers: MdLayers,
  inbox: BsFillInboxFill,
};

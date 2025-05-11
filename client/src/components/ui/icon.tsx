import React from "react";
import { LucideProps } from "lucide-react";
import {
  Menu,
  MedicalServices,
  Edit,
  Download,
  Save,
  Facebook,
  Instagram,
  Twitter,
  MailOutline,
  AccessibilityNew,
  Elderly,
  BackHand,
  Healing,
  PregnantWoman,
  Psychology,
  Phone,
  LocationOn,
  Schedule,
  Person,
} from "@mui/icons-material";

// Export all icons needed for the application
export {
  Menu,
  MedicalServices,
  Edit,
  Download,
  Save,
  Facebook,
  Instagram,
  Twitter,
  MailOutline,
  AccessibilityNew,
  Elderly,
  BackHand,
  Healing,
  PregnantWoman,
  Psychology,
  Phone,
  LocationOn,
  Schedule,
  Person,
};

// Fallback icon component if needed
export const Icon = ({ name, ...props }: { name: string } & LucideProps) => {
  // This is a fallback in case we need to dynamically load icons
  const IconComponent = {
    menu: Menu,
    medicalServices: MedicalServices,
    edit: Edit,
    download: Download,
    save: Save,
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    mailOutline: MailOutline,
    accessibilityNew: AccessibilityNew,
    elderly: Elderly,
    backHand: BackHand,
    healing: Healing,
    pregnantWoman: PregnantWoman,
    psychology: Psychology,
    phone: Phone,
    locationOn: LocationOn,
    schedule: Schedule,
    person: Person,
  }[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return <IconComponent {...props} />;
};

export default Icon;

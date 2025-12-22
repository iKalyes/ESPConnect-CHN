export type DeviceFact = {
  label: string;
  value: string;
  icon: string | null;
};

export type DeviceFactGroup = {
  title: string;
  icon: string;
  items: DeviceFact[];
};

export type DeviceDetails = {
  name: string;
  description: string;
  features: string[];
  mac: string | null;
  flashSize: string | null;
  crystal: string | null;
  facts: DeviceFact[];
  factGroups: DeviceFactGroup[];
};

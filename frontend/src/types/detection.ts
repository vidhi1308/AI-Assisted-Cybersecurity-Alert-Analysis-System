export type DetectionItem =
  | string
  | {
      id?: string;
      detection_id?: string;
      name?: string;
      title?: string;
      description?: string;
      query?: string;
      tactics?: string[];
      techniques?: string[];
      [key: string]: any;
    };

export type DetectionListResponse = {
  count: number;
  vendor_dir: string;
  detections: DetectionItem[];
};
export type JobTitle = {
  id: number;
  title: string;
  createdAt?: string;
  updatedAt?: string;
};

export type JobTitleRequest = {
  title: string;
};

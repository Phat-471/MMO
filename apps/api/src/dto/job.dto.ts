import { IsOptional, IsString } from "class-validator";

export class CreateJobDto {
  @IsString({ message: "Nền tảng không hợp lệ." })
  platform!: string;

  @IsString({ message: "Loại tác vụ không hợp lệ." })
  jobType!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @IsOptional()
  @IsString()
  optionsJson?: string;
}

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  jobType?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  optionsJson?: string;
}


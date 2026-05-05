import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateWorkspaceToolDto {
  @IsOptional()
  @IsBoolean({ message: "Trạng thái bật/tắt tool không hợp lệ." })
  enabled?: boolean;

  @IsOptional()
  @IsString({ message: "Thiết lập tool phải là chuỗi JSON." })
  settingsJson?: string;
}

export class CreateJobFromToolDto {
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

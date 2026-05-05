import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateAccountDto {
  @IsString({ message: "Nhãn tài khoản không hợp lệ." })
  @MinLength(2, { message: "Nhãn tài khoản phải có ít nhất 2 ký tự." })
  label!: string;

  @IsString({ message: "Nền tảng không hợp lệ." })
  platform!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  cookie?: string;

  @IsOptional()
  @IsString()
  proxy?: string;

  @IsOptional()
  @IsString()
  twoFa?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  cookie?: string;

  @IsOptional()
  @IsString()
  proxy?: string;

  @IsOptional()
  @IsString()
  twoFa?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  groupName?: string;
}

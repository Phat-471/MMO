import { IsEmail, IsString, MinLength } from "class-validator";

export class AuthRegisterDto {
  @IsEmail({}, { message: "Email không hợp lệ." })
  email!: string;

  @IsString({ message: "Mật khẩu không hợp lệ." })
  @MinLength(8, { message: "Mật khẩu phải có ít nhất 8 ký tự." })
  password!: string;

  @IsString({ message: "Tên không gian làm việc không hợp lệ." })
  workspaceName!: string;
}

export class AuthLoginDto {
  @IsEmail({}, { message: "Email không hợp lệ." })
  email!: string;

  @IsString({ message: "Mật khẩu không hợp lệ." })
  password!: string;
}


import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateWorkspaceDto {
  @IsString({ message: "Tên không gian làm việc không hợp lệ." })
  @MinLength(2, { message: "Tên không gian làm việc phải có ít nhất 2 ký tự." })
  name!: string;

  @IsOptional()
  @IsString({ message: "Slug không hợp lệ." })
  slug?: string;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString({ message: "Tên không gian làm việc không hợp lệ." })
  @MinLength(2, { message: "Tên không gian làm việc phải có ít nhất 2 ký tự." })
  name?: string;

  @IsOptional()
  @IsString({ message: "Slug không hợp lệ." })
  slug?: string;
}

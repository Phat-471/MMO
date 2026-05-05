import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";

export class CreateWorkspaceMemberDto {
  @IsEmail({}, { message: "Email khong hop le." })
  email!: string;

  @IsOptional()
  @IsIn(["ADMIN", "USER", "VIEWER", "AFFILIATE"], {
    message: "Vai tro thanh vien khong hop le."
  })
  role?: "ADMIN" | "USER" | "VIEWER" | "AFFILIATE";
}

export class UpdateWorkspaceMemberDto {
  @IsString()
  @IsIn(["ADMIN", "USER", "VIEWER", "AFFILIATE"], {
    message: "Vai tro thanh vien khong hop le."
  })
  role!: "ADMIN" | "USER" | "VIEWER" | "AFFILIATE";
}

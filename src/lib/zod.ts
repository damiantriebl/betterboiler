import { object, string } from "zod";

const getPasswordSchema = (type: "password" | "confirmPassword") => string({ required_error: `${type} es requerido` })
    .min(4, `${type} tiene que ser 4 caracteres`)
    .max(32, `${type} no puede exceder los 32 caracteres`)

const getEmailSchema = () => string({ required_error: "email es requerido" }).min(1, "Email es requerido").email("Mail invalido")

const getNameSchema = () => string({ required_error: "el nombre es requerido" })
        .min(1, "El nombre es requerido")
        .max(50, "el nombre no puede tener mas de 50 caracteres")

export const signUpSchema = object({
    name: getNameSchema(),
    email: getEmailSchema(),
    password: getPasswordSchema('password'),
    confirmPassword: getPasswordSchema('confirmPassword')
}).refine((data)=> data.password === data.confirmPassword, {
    message: "las contraseñas no coinciden",
    path: ["confirmPassword"]
})

export const signInSchema = object({
    email: getEmailSchema(),
    password: getPasswordSchema('password')
})

export const forgotPasswordSchema = object({
    email: getEmailSchema()
})
export const resetPasswordSchema = object ({
    password: getPasswordSchema("password"),
    confirmPassword: getPasswordSchema("confirmPassword")
}).refine((data)=> data.password === data.confirmPassword, {
    message: "las contraseñas no coinciden",
    path: ["confirmPassword"]
})
import { IntegerType, Repository } from "typeorm";
import bcrypt from "bcrypt"
import { FullUserDetails, RegisterUser } from "../types/auth";
import { AppDataSource } from "../config/datasource";
import UserAccount from "../entities/userAccount";
import DuplicateResourceException from "../exceptions/duplicateResourceException";
import UserMapper from "../mappers/userMapper";
import InternalUserLogin from "../entities/internalUserLogin";
import { injectable } from "inversify";
import { Login, RegisterUserSchema, RegisterUserSchemaWIthPass } from "../types/zodTypes";
import UserManager from "./userManager";
import jwt from "jsonwebtoken"

@injectable()
export default class InternalAuthManager {
    protected userRepository: Repository<UserAccount>;
    protected internalLoginRepository: Repository<InternalUserLogin>; 
    protected userManager: UserManager;

    constructor(userManager: UserManager) {
        this.userRepository = AppDataSource.getRepository(UserAccount);
        this.internalLoginRepository = AppDataSource.getRepository(InternalUserLogin);
        this.userManager = userManager;
    }

    public async register (registerInfo: RegisterUserSchemaWIthPass): Promise<FullUserDetails> {

        const email = registerInfo.email;
        const userWithEmail = await this.userRepository.findOneBy({
            email
        })

        if (userWithEmail) {
            throw new DuplicateResourceException("Duplicate Email!");
        }

        const createdUser = await this.userManager.createUser(registerInfo);
        await this.saveInternalLoginData(registerInfo.password, createdUser);
        return UserMapper.toFullUserDetails(createdUser);
    }

    public async login(loginForm: Login) {
        const userToLogin = await this.userRepository.findOneBy({email: loginForm.email});
        if (!userToLogin) {
            throw new Error("Invalid email");
        }
        const loginData = await this.internalLoginRepository.createQueryBuilder(`select * from internal_user_login where userId = ${userToLogin.id}`).getOne();
        if (!loginData) {
            throw new Error("Not login information");
        }
        const isPasswordValid = bcrypt.compareSync(loginForm.password, loginData.passwordHash);
        if (!isPasswordValid) {
            throw new Error("Invalid password");
        }
        const token = jwt.sign({
            userId: userToLogin.id
        }, "private key")
        return token;
    }

    private async saveInternalLoginData(password: string,  user: UserAccount): Promise<void> {
        const passwordHash = bcrypt.hashSync(password, 10);
        const userLoginData = new InternalUserLogin(user, passwordHash);
        this.internalLoginRepository.save(userLoginData);
    }
}
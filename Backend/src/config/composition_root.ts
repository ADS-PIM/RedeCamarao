import { adminController, passwordResetController } from "./module/admin_module";
import { userController } from "./module/user_module";
import { offerController } from "./module/offer_module";
import { offerPhotoController } from "./module/offerPhoto_module";

export const controllers = {
    adminController,
    passwordResetController,
    userController,
    offerController,
    offerPhotoController
};

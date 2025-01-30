import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnboardingScreen, OnboardingScreenDocument } from '../schema/onboarding-screen.schema';
import { CreateOnboardingScreenDto } from '../dto/create-onboarding-screen.dto';
import { UpdateOnboardingScreenDto } from '../dto/update-onboarding-screen.dto'; 
import { ReorderScreensDto } from '../dto/reorder-screens.dto';
import { 
  OnboardingScreenCategory, 
  OnboardingScreenType,
  WelcomeScreenTypeEnum,
  PermissionScreenTypeEnum 
} from '../../../types/onboarding-screen.types';

@Injectable()
export class OnboardingScreensService {
  constructor(
    @InjectModel(OnboardingScreen.name)
    private onboardingScreenModel: Model<OnboardingScreenDocument>,
  ) {}

  async create(createOnboardingScreenDto: CreateOnboardingScreenDto): Promise<OnboardingScreen> {
    const maxOrderScreen = await this.onboardingScreenModel
      .findOne({ appId: createOnboardingScreenDto.appId })
      .sort({ order: -1 });

    const nextOrder = maxOrderScreen ? maxOrderScreen.order + 1 : 0;

    const createdScreen = new this.onboardingScreenModel({
      ...createOnboardingScreenDto,
      order: nextOrder,
      isActive: true,
      enabled: true,
    });

    return createdScreen.save();
  }

  async findAllByAppId(
    appId: string, 
    category?: OnboardingScreenCategory,
    screenType?: OnboardingScreenType,
  ): Promise<OnboardingScreen[]> {
    const query: any = { appId };

    if (category) {
      query.category = category;  
    }

    if (screenType) {
      query.screenType = screenType;
    }

    return this.onboardingScreenModel.find(query).sort({ order: 1 }).exec();
  }

  async findOne(id: string): Promise<OnboardingScreen> {
    const screen = await this.onboardingScreenModel.findById(id).exec();

    if (!screen) {
      throw new NotFoundException(`Onboarding screen with ID ${id} not found`);
    }

    return screen;
  }

  async update(id: string, updateOnboardingScreenDto: UpdateOnboardingScreenDto): Promise<OnboardingScreen> {
    const updatedScreen = await this.onboardingScreenModel
      .findByIdAndUpdate(id, updateOnboardingScreenDto, { new: true })
      .exec();

    if (!updatedScreen) {
      throw new NotFoundException(`Onboarding screen with ID ${id} not found`);
    }

    return updatedScreen;
  }

  async remove(id: string): Promise<OnboardingScreen> {
    const deletedScreen = await this.onboardingScreenModel.findByIdAndDelete(id).exec();

    if (!deletedScreen) {
      throw new NotFoundException(`Onboarding screen with ID ${id} not found`);
    }

    // Update order of remaining screens
    await this.onboardingScreenModel.updateMany(
      { appId: deletedScreen.appId, order: { $gt: deletedScreen.order } }, 
      { $inc: { order: -1 } },
    ).exec();

    return deletedScreen;
  }

  async reorder(appId: string, reorderScreensDto: ReorderScreensDto): Promise<OnboardingScreen[]> {
    const { screens } = reorderScreensDto;

    await Promise.all(
      screens.map(async ({ id, order }) => {
        await this.onboardingScreenModel.updateOne({ _id: id, appId }, { order }).exec();
      }),
    );

    return this.findAllByAppId(appId);
  }

  async ensureDefaultScreenExists(
    appId: string,
    category?: OnboardingScreenCategory,
    screenType?: OnboardingScreenType,
  ): Promise<OnboardingScreen[]> {
    const existingScreens = await this.findAllByAppId(appId, category, screenType);

    if (existingScreens.length > 0) {
      return existingScreens;
    }

    const defaultScreens: CreateOnboardingScreenDto[] = this.getDefaultScreens(appId, category, screenType);

    const createdScreens = await Promise.all(defaultScreens.map(screen => this.create(screen)));

    return createdScreens;
  }

  private getDefaultScreens(
    appId: string,
    category?: OnboardingScreenCategory, 
    screenType?: OnboardingScreenType,
  ): CreateOnboardingScreenDto[] {
    const defaultScreens: CreateOnboardingScreenDto[] = [
      {
        appId,
        title: 'Welcome',
        description: 'Welcome to the app!',
        icon: 'waving-hand',
        category: OnboardingScreenCategory.WELCOME,
        screenType: WelcomeScreenTypeEnum.GREETING,
        order: 0,
      },
      {
        appId,
        title: 'Notifications',
        description: 'Enable notifications to stay updated',
        icon: 'bell',
        category: OnboardingScreenCategory.PERMISSION,  
        screenType: PermissionScreenTypeEnum.NOTIFICATIONS,
        order: 1,
      },
      // Add more default screens as needed
    ];

    if (category) {
      return defaultScreens.filter(screen => screen.category === category);
    }

    if (screenType) {
      return defaultScreens.filter(screen => screen.screenType === screenType);
    }

    return defaultScreens;
  }
}
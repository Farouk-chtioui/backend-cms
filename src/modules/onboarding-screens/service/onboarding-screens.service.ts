import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnboardingScreen, OnboardingScreenDocument } from '../schema/onboarding-screen.schema';
import { CreateOnboardingScreenDto } from '../dto/create-onboarding-screen.dto';
import { UpdateOnboardingScreenDto } from '../dto/update-onboarding-screen.dto'; 
import { ReorderScreensDto } from '../dto/reorder-screens.dto';
import { OnboardingScreenCategory, OnboardingScreenType } from '../../../types/onboarding-screen.types';

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
}
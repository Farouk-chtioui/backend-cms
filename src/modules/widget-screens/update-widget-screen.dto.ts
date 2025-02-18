import { PartialType } from '@nestjs/mapped-types';
import { CreateWidgetScreenDto } from './create-widget-screen.dto';

export class UpdateWidgetScreenDto extends PartialType(CreateWidgetScreenDto) {}
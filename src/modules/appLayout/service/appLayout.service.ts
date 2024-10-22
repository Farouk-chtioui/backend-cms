import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tab } from '../schema/tab.entity';
import { CreateTabDto } from '../dto/createTab.dto';

@Injectable()
export class AppLayoutService {
  constructor(
    @InjectRepository(Tab)
    private tabRepository: Repository<Tab>,
  ) {}

  findAll(): Promise<Tab[]> {
    return this.tabRepository.find();
  }

  create(createTabDto: CreateTabDto): Promise<Tab> {
    const tab = this.tabRepository.create(createTabDto);
    return this.tabRepository.save(tab);
  }

  async update(id: number, updateTabDto: CreateTabDto): Promise<Tab> {
    const tab = await this.tabRepository.findOne({ where: { id } });
    if (tab) {
      Object.assign(tab, updateTabDto);
      return this.tabRepository.save(tab);
    }
    throw new Error('Tab not found');
  }

  delete(id: number): Promise<void> {
    return this.tabRepository.delete(id).then(() => undefined);
  }
}

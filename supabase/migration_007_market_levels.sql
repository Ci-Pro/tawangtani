-- 007: Harga per tingkat pasar PIHPS (1=Produsen, 2=Grosir/Pasar Besar, 3=Konsumen)
alter table public.market_prices add column if not exists level smallint not null default 3;

alter table public.market_prices drop constraint if exists market_prices_pkey;
alter table public.market_prices add primary key (commodity, province, level);
create index if not exists market_prices_province_idx on public.market_prices (province);

alter table public.market_price_history add column if not exists level smallint not null default 3;
alter table public.market_price_history drop constraint if exists market_price_history_commodity_province_date_key;
alter table public.market_price_history add constraint market_price_history_unique unique (commodity, province, level, date);

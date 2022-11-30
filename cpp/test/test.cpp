#include <cctype>
#include <random>

#include "../writer.hpp"

using u32 = uint_least32_t;
using engine = std::mt19937;

int main(int, char**) {
  std::random_device os_seed;
  const u32 seed = os_seed();

  engine generator(seed);
  std::normal_distribution<double> distribution(0., 1.0);

  DataMo::Writer writer("./");

  {
    DataMo::MetaProjectItem item("Test project");
    writer.write_data(&item);
  }

  {
    DataMo::ScalarItem item("Loss", distribution(generator));
    writer.write_data(&item);
  }

  {
    DataMo::ScalarItem item("ValLoss", 12.246);
    writer.write_data(&item);
  }

  {
    DataMo::ScalarItem item("Loss", distribution(generator));
    writer.write_data(&item);
  }

  {
    DataMo::ScalarItem item("Loss", distribution(generator));
    writer.write_data(&item);
  }
  {
    DataMo::ScalarItem item("Very very very long description of a parameter",
                            2);
    writer.write_data(&item);
  }
  {
    DataMo::TensorItem item("Some tensor", torch::rand({10, 2}));
    writer.write_data(&item);
  }
  {
    DataMo::StringItem item("Plop", "Plap");
    writer.write_data(&item);
  }

  return 0;
}
